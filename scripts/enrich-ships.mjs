/**
 * 船舶データベース自動補完スクリプト
 *
 * scraped.json に含まれる船名のうち、shipDatabase.json に未登録のものを
 * Web 検索して船舶情報を取得し、データベースに追加する。
 *
 * 使い方:
 *   node scripts/enrich-ships.mjs
 *
 * 環境変数:
 *   DRY_RUN=1  — 検索のみ行い JSON を更新しない
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "shipDatabase.json");
const SCRAPED_PATH = path.join(__dirname, "..", "data", "scraped.json");
const DRY_RUN = process.env.DRY_RUN === "1";

// ── 国旗マッピング ─────────────────────────────
const FLAG_MAP = {
  bahamas: "🇧🇸", malta: "🇲🇹", bermuda: "🇧🇲", panama: "🇵🇦",
  "marshall islands": "🇲🇭", italy: "🇮🇹", netherlands: "🇳🇱",
  norway: "🇳🇴", japan: "🇯🇵", uk: "🇬🇧", "united kingdom": "🇬🇧",
  usa: "🇺🇸", "united states": "🇺🇸", germany: "🇩🇪", france: "🇫🇷",
  greece: "🇬🇷", portugal: "🇵🇹", singapore: "🇸🇬", china: "🇨🇳",
  "hong kong": "🇭🇰", denmark: "🇩🇰", sweden: "🇸🇪", finland: "🇫🇮",
  cyprus: "🇨🇾", gibraltar: "🇬🇮", liberia: "🇱🇷",
};

function flagEmoji(country) {
  if (!country) return "🚢";
  const lower = country.toLowerCase().trim();
  return FLAG_MAP[lower] ?? "🚢";
}

// ── 船名→英語名の推測 ────────────────────────────
// カタカナ船名をローマ字に変換するのは難しいので、Web検索に頼る
// ただし、よくあるパターンは手動マッピングで対応
const KATAKANA_EN_HINTS = {
  "シルバー": "Silver", "セブンシーズ": "Seven Seas",
  "ノルウェージャン": "Norwegian", "コスタ": "Costa",
  "セレブリティ": "Celebrity", "カーニバル": "Carnival",
  "ディズニー": "Disney", "バイキング": "Viking",
  "シーボーン": "Seabourn", "アイーダ": "AIDA",
  "クリスタル": "Crystal", "アザマラ": "Azamara",
  "オイローパ": "Europa", "レガッタ": "Regatta",
  "クイーン": "Queen", "マインシフ": "Mein Schiff",
};

/**
 * Wikipedia や CruiseMapper から船舶情報を検索
 * Google検索の代わりに、DuckDuckGo の Instant Answer API を使用
 */
async function searchShipInfo(shipName) {
  console.log(`  🔍 検索中: ${shipName}`);

  // まず英語名を推測して Wikipedia から探す
  const englishQuery = guessEnglishName(shipName);
  const queries = [
    `${englishQuery} cruise ship`,
    `${shipName} クルーズ船 総トン数`,
  ];

  for (const query of queries) {
    try {
      const info = await tryWikipediaSearch(englishQuery);
      if (info) return info;
    } catch { /* continue */ }
  }

  // DuckDuckGo Instant Answer
  try {
    const info = await tryDuckDuckGo(englishQuery + " cruise ship");
    if (info) return info;
  } catch { /* continue */ }

  // CruiseMapper から直接検索
  try {
    const info = await tryCruiseMapper(englishQuery);
    if (info) return info;
  } catch { /* continue */ }

  return null;
}

function guessEnglishName(japaneseName) {
  // "・" で分割して各パーツを変換
  let name = japaneseName;
  for (const [ja, en] of Object.entries(KATAKANA_EN_HINTS)) {
    name = name.replace(ja, en);
  }
  // 残りのカタカナをそのまま使う（ローマ字変換は不完全なので）
  // "・" を空白に
  name = name.replace(/・/g, " ").replace(/[Ⅱ]/g, "II").replace(/[Ⅲ]/g, "III");
  return name;
}

async function tryWikipediaSearch(query) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, "_"))}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "HarumiFerryTerminal/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;

  const data = await resp.json();
  const extract = data.extract ?? "";

  return parseShipInfoFromText(extract, query);
}

async function tryDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "HarumiFerryTerminal/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;

  const data = await resp.json();
  const text = [data.Abstract, data.AbstractText, data.Answer].filter(Boolean).join(" ");
  if (!text) return null;

  return parseShipInfoFromText(text, query);
}

async function tryCruiseMapper(query) {
  // CruiseMapper の ship ページから情報取得を試みる
  const slug = query.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const url = `https://www.cruisemapper.com/ships/${slug}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "HarumiFerryTerminal/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;

  const html = await resp.text();
  return parseShipInfoFromHtml(html, query);
}

function parseShipInfoFromText(text, nameHint) {
  if (!text || text.length < 30) return null;

  const info = {};

  // Gross tonnage: "91,000 GT" or "91000 gross tons"
  const gtMatch = text.match(/([\d,]+)\s*(?:GT|gross\s*tonn?(?:age|s)?|GRT)/i);
  if (gtMatch) info.grossTonnage = gtMatch[1].replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Passengers: "2,000 passengers" or "passenger capacity of 2000"
  const paxMatch = text.match(/([\d,]+)\s*(?:passengers|pax|guest)/i)
    ?? text.match(/passenger\s*(?:capacity|complement)?\s*(?:of|:)?\s*([\d,]+)/i);
  if (paxMatch) info.passengers = parseInt(paxMatch[1].replace(/,/g, ""));

  // Built year: "built in 2019" or "entered service in 2019" or "launched in 2019"
  const yearMatch = text.match(/(?:built|launched|entered\s*service|completed|maiden\s*voyage)\s*(?:in\s*)?(\d{4})/i)
    ?? text.match(/(\d{4})\s*(?:build|built|launch)/i);
  if (yearMatch) info.builtYear = parseInt(yearMatch[1]);

  // Length: "300 m" or "300m" or "984 ft"
  const lenMatch = text.match(/([\d.]+)\s*m(?:etr?e?s?)?\s*(?:long|length|overall|LOA)/i)
    ?? text.match(/(?:length|LOA|long)\s*(?:overall|:)?\s*([\d.]+)\s*m/i);
  if (lenMatch) info.length = `${Math.round(parseFloat(lenMatch[1]))}m`;

  // Operator: "operated by XXX" or "owned by XXX"
  const opMatch = text.match(/(?:operated|owned|managed)\s*by\s*([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/);
  if (opMatch) info.operator = opMatch[1].trim();

  // Flag/registry
  const flagMatch = text.match(/(?:flag|registry|registered)\s*(?:of|in|:)?\s*(?:the\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (flagMatch) info.flag = flagEmoji(flagMatch[1]);

  // English name from hint
  info.nameEn = nameHint || "";

  // 最低限 grossTonnage か passengers があれば有効とみなす
  if (info.grossTonnage || info.passengers) return info;
  return null;
}

function parseShipInfoFromHtml(html, nameHint) {
  const info = { nameEn: nameHint };

  // CruiseMapper のページから基本情報を抽出
  const gtMatch = html.match(/Gross\s*Tonnage[^<]*?<[^>]*>([\d,]+)/i);
  if (gtMatch) info.grossTonnage = gtMatch[1];

  const paxMatch = html.match(/Passengers[^<]*?<[^>]*>([\d,]+)/i);
  if (paxMatch) info.passengers = parseInt(paxMatch[1].replace(/,/g, ""));

  const yearMatch = html.match(/(?:Year\s*Built|Built)[^<]*?<[^>]*>(\d{4})/i);
  if (yearMatch) info.builtYear = parseInt(yearMatch[1]);

  const lenMatch = html.match(/Length[^<]*?<[^>]*>([\d.]+)\s*m/i);
  if (lenMatch) info.length = `${Math.round(parseFloat(lenMatch[1]))}m`;

  const opMatch = html.match(/Operator[^<]*?<[^>]*>([^<]+)/i);
  if (opMatch) info.operator = opMatch[1].trim();

  const flagMatch = html.match(/Flag[^<]*?<[^>]*>([^<]+)/i);
  if (flagMatch) info.flag = flagEmoji(flagMatch[1]);

  if (info.grossTonnage || info.passengers) return info;
  return null;
}

// ── メイン処理 ──────────────────────────────────
async function main() {
  console.log("🚢 船舶データベース自動補完 開始\n");

  // 1. 既存データ読み込み
  const db = JSON.parse(await fs.readFile(DB_PATH, "utf-8"));
  const scraped = JSON.parse(await fs.readFile(SCRAPED_PATH, "utf-8"));

  // 2. 未知の船名を抽出
  const allShipNames = [...new Set(scraped.arrivals.map((a) => a.shipName))];
  const unknownShips = allShipNames.filter((name) => !db[name]);

  console.log(`📊 統計:`);
  console.log(`  データベース登録済み: ${Object.keys(db).length}隻`);
  console.log(`  スクレイプデータ内: ${allShipNames.length}隻（ユニーク）`);
  console.log(`  未登録: ${unknownShips.length}隻\n`);

  if (unknownShips.length === 0) {
    console.log("✅ すべての船がデータベースに登録済みです。");
    return;
  }

  console.log("🔍 未登録の船を検索します...\n");
  let addedCount = 0;

  for (const shipName of unknownShips) {
    try {
      const info = await searchShipInfo(shipName);
      if (info) {
        const entry = {
          nameEn: info.nameEn || "",
          operator: info.operator || "",
          grossTonnage: info.grossTonnage || "",
          passengers: info.passengers || 0,
          builtYear: info.builtYear || 0,
          flag: info.flag || "🚢",
        };
        if (info.length) entry.length = info.length;

        console.log(`  ✅ ${shipName} → ${entry.nameEn || "?"} (${entry.grossTonnage || "?"} GT, ${entry.passengers || "?"} pax)`);
        db[shipName] = entry;
        addedCount++;
      } else {
        console.log(`  ⚠️  ${shipName} — 情報が見つかりませんでした`);
        // 空エントリを追加（再検索を防ぐためスキップマーカー）
        // 次回のスクレイプ時に再試行する場合はコメントアウト
      }
    } catch (err) {
      console.error(`  ❌ ${shipName} — エラー: ${err.message}`);
    }

    // レート制限対策
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 3. JSON更新
  if (addedCount > 0 && !DRY_RUN) {
    // キー名でソートして保存
    const sorted = Object.fromEntries(
      Object.entries(db).sort(([a], [b]) => a.localeCompare(b, "ja"))
    );
    await fs.writeFile(DB_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
    console.log(`\n💾 データベース更新: ${addedCount}隻 追加 → 合計 ${Object.keys(sorted).length}隻`);
  } else if (DRY_RUN) {
    console.log(`\n🔸 DRY_RUN: ${addedCount}隻の情報を取得しましたが、JSON は更新しません`);
  } else {
    console.log(`\n⚠️  新しい情報は見つかりませんでした`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
