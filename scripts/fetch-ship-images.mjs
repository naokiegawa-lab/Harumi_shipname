/**
 * 船舶外観写真の自動取得スクリプト
 *
 * shipDatabase.json の各船について、英語名（nameEn）から Wikimedia の
 * 自由ライセンス画像を探し、サムネイル URL とクレジットを `image` に保存する。
 * 画像ファイル自体はダウンロードせず、表示時に upload.wikimedia.org から読み込む。
 *
 * 検索順:
 *   1. Wikidata — 船のアイテムに登録された代表画像（P18）
 *   2. Wikimedia Commons — 船カテゴリ「<船名> (ship, <建造年>)」内の画像
 * 同名の別船を拾わないよう、DB の建造年（builtYear）と ±1年で照合する。
 *
 * 使い方:
 *   node scripts/fetch-ship-images.mjs
 *
 * 環境変数:
 *   DRY_RUN=1  — 検索のみ行い JSON を更新しない
 *   FORCE=1    — 画像登録済みの船も再検索する
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "shipDatabase.json");
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";

// Wikimedia の API 利用規約により、連絡先付きの User-Agent が必要
const USER_AGENT = "HarumiShips/1.0 (https://github.com/naokiegawa-lab/Harumi_shipname)";
// 詳細ページのヒーロー（最大約1000px幅）でも粗くならない幅。表示時は next/image が縮小する
const THUMB_WIDTH = 1280;
const SHIP_DESCRIPTION = /ship|cruise|liner|vessel|yacht|ferry/i;

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  return resp.json();
}

const wikidata = (params) => api("https://www.wikidata.org/w/api.php", params);
const commons = (params) => api("https://commons.wikimedia.org/w/api.php", params);

/** 比較用に正規化（大文字小文字・記号・MS/MV 等の船舶接頭辞を無視） */
function normalize(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(ms|mv|ss|m\/s|m\/v)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const yearMatches = (year, builtYear) => Math.abs(year - builtYear) <= 1;

/**
 * 同名の船（初代と2代目など）を建造年で絞り込む。
 * 年が合う候補があればそれを採用する。合わない場合は候補が1つのときだけ、
 * 年が不明か、クルーズ船として登録されている（名前が一意＝DB の年の誤りとみなす）なら採用する。
 * それ以外は別の船の可能性があるので捨てる（誤った写真より写真なしを優先）。
 */
function pickByYear(candidates, builtYear) {
  if (builtYear) {
    const matched = candidates.filter((c) => c.year && yearMatches(c.year, builtYear));
    if (matched.length > 0) return matched;
  }
  if (candidates.length !== 1) return [];
  const [only] = candidates;
  return !builtYear || !only.year || only.isCruiseShip ? candidates : [];
}

function claimYear(claims, property) {
  const time = claims?.[property]?.[0]?.mainsnak?.datavalue?.value?.time; // "+2010-00-00T00:00:00Z"
  return time ? parseInt(time.slice(1, 5)) : null;
}

/** 1. Wikidata の船アイテムから P18（代表画像）のファイル名を得る */
async function findOnWikidata(nameEn, builtYear) {
  const target = normalize(nameEn);
  const search = await wikidata({
    action: "wbsearchentities",
    search: nameEn,
    language: "en",
    type: "item",
    limit: "20",
  });

  const ships = (search.search ?? []).filter(
    (item) =>
      normalize(item.match?.text ?? item.label ?? "") === target &&
      SHIP_DESCRIPTION.test(item.description ?? "")
  );
  if (ships.length === 0) return null;

  const entities = await wikidata({
    action: "wbgetentities",
    ids: ships.map((s) => s.id).join("|"),
    props: "claims",
  });

  const candidates = ships.map((s) => {
    const claims = entities.entities?.[s.id]?.claims;
    return {
      id: s.id,
      isCruiseShip: /cruise/i.test(s.description ?? ""),
      // P571: 建造（起工・竣工）, P729: 就航
      year: claimYear(claims, "P571") ?? claimYear(claims, "P729"),
      fileName: claims?.P18?.[0]?.mainsnak?.datavalue?.value,
    };
  });

  const picked = pickByYear(candidates, builtYear).find((c) => c.fileName);
  return picked ? { fileName: picked.fileName, source: `wikidata:${picked.id}` } : null;
}

async function categoryMembers(title, type) {
  const result = await commons({
    action: "query",
    list: "categorymembers",
    cmtitle: title,
    cmtype: type,
    cmlimit: "50",
  });
  return (result.query?.categorymembers ?? []).map((m) => m.title);
}

const INTERIOR_WORDS = /interior|innen|bibliot|library|cabin|suite|lounge|restaurant|atrium|theat|pool|spa\b|deck ?plan|model/i;

/**
 * 船カテゴリから外観写真を探す。
 * 1. 船名入りのファイル名で、船内写真らしき語を含まないもの（直下・寄港地サブカテゴリとも）
 * 2. なければ寄港地「<カテゴリ名> in <港>」の写真（寄港地写真はほぼ外観）
 */
async function findPhotoInCategory(category, target) {
  const photos = (titles) =>
    titles.map((t) => t.replace(/^File:/, "")).filter((f) => /\.(jpe?g|png)$/i.test(f));

  const portCategories = (await categoryMembers(category, "subcat"))
    .filter((t) => t.startsWith(`${category} in `))
    .slice(0, 5);
  const portPhotos = [];
  for (const sub of portCategories) portPhotos.push(...photos(await categoryMembers(sub, "file")));
  const directPhotos = photos(await categoryMembers(category, "file"));

  const named = [...portPhotos, ...directPhotos].find(
    (f) => normalize(f).includes(target) && !INTERIOR_WORDS.test(f)
  );
  return named ?? portPhotos[0] ?? null;
}

/**
 * 2. Commons の船カテゴリ「Category:<船名> (ship, <建造年>)」から写真を探す。
 * 同名船が多いと検索ではサブカテゴリに埋もれるため、建造年±1のカテゴリ名を直接引く。
 */
async function findOnCommons(nameEn, builtYear) {
  if (!builtYear) return null;
  const target = normalize(nameEn);

  for (const year of [builtYear, builtYear - 1, builtYear + 1]) {
    const category = `Category:${nameEn} (ship, ${year})`;
    const fileName = await findPhotoInCategory(category, target);
    if (fileName) return { fileName, source: category };
  }
  return null;
}

function stripHtml(html) {
  return (html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Commons のファイル情報（サムネイル URL・撮影者・ライセンス）を取得 */
async function getImageInfo(fileName) {
  const result = await commons({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
  });
  const page = Object.values(result.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  // ライセンス表記が取れない画像はクレジットを出せないため使わない
  if (!license) return null;

  const image = {
    // utm_* などの計測用クエリは不要なので落とす
    url: (info.thumburl ?? info.url).split("?")[0],
    pageUrl: info.descriptionurl,
    author: stripHtml(meta.Artist?.value) || "不明",
    license,
  };
  const licenseUrl = meta.LicenseUrl?.value;
  if (licenseUrl) image.licenseUrl = licenseUrl;
  return image;
}

async function findShipImage({ nameEn, builtYear }) {
  const found =
    (await findOnWikidata(nameEn, builtYear)) ?? (await findOnCommons(nameEn, builtYear));
  if (!found) return null;
  const image = await getImageInfo(found.fileName);
  return image ? { image, ...found } : null;
}

// ── メイン処理 ──────────────────────────────────
async function main() {
  console.log("📷 船舶写真の自動取得 開始\n");

  const db = JSON.parse(await fs.readFile(DB_PATH, "utf-8"));
  const targets = Object.entries(db).filter(([, ship]) => ship.nameEn && (FORCE || !ship.image));

  console.log(`  データベース: ${Object.keys(db).length}隻 / 検索対象: ${targets.length}隻\n`);
  if (targets.length === 0) {
    console.log("✅ すべての船に写真が登録済みです。");
    return;
  }

  let foundCount = 0;
  for (const [shipName, ship] of targets) {
    try {
      const result = await findShipImage(ship);
      if (result) {
        ship.image = result.image;
        foundCount++;
        console.log(`  ✅ ${shipName} (${ship.nameEn}) ← ${result.source}: ${result.image.pageUrl}`);
      } else {
        console.log(`  ⚠️  ${shipName} (${ship.nameEn}) — 写真が見つかりませんでした`);
      }
    } catch (err) {
      console.error(`  ❌ ${shipName} — エラー: ${err.message}`);
    }

    // レート制限対策
    await new Promise((r) => setTimeout(r, 500));
  }

  if (foundCount > 0 && !DRY_RUN) {
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2) + "\n", "utf-8");
    console.log(`\n💾 データベース更新: ${foundCount}隻に写真を登録`);
  } else if (DRY_RUN) {
    console.log(`\n🔸 DRY_RUN: ${foundCount}隻の写真が見つかりましたが、JSON は更新しません`);
  } else {
    console.log(`\n⚠️  新しい写真は見つかりませんでした`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
