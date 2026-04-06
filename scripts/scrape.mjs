/**
 * 晴海客船ターミナル スクレイパー
 * 東京都港湾局 Power BI ダッシュボードからデータを取得し
 * data/scraped.json に保存します。
 *
 * 使い方:
 *   node scripts/scrape.mjs
 *
 * GitHub Actions からも自動実行されます（.github/workflows/scrape.yml）
 */

import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "scraped.json");

const POWER_BI_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiZDcxNWQ1YTYtYzYyOS00ZTM3LWJhOTctMmNlZDFmY2Y2OGE2IiwidCI6ImQwMzAyZmNjLTNlODEtNDljMy04MjM1LWQzMTFhMzY4NGNmYyJ9";

/** Power BI のターミナル表記を正規化 */
function normalizeTerminal(raw) {
  if (!raw) return "東京国際クルーズターミナル";
  if (raw.includes("晴海")) return "晴海客船ターミナル";
  if (raw.includes("有明") || raw.includes("国際")) return "東京国際クルーズターミナル";
  return raw.trim();
}

/** 日付文字列を YYYY-MM-DD に正規化 */
function normalizeDate(raw) {
  if (!raw) return null;
  // "2026/4/6" → "2026-04-06"
  const m = raw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  // "4月6日" → "2026-04-06"（年は今年と仮定）
  const m2 = raw.match(/(\d{1,2})月(\d{1,2})日/);
  if (m2) {
    const year = new Date().getFullYear();
    return `${year}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

/** Power BI テーブルのヘッダーと行を抽出 */
async function extractTableData(page) {
  return await page.evaluate(() => {
    const results = [];

    // Power BI のテーブルビジュアルを探す
    // セレクタはバージョンにより変わる可能性があるため複数パターン試す
    const tableSelectors = [
      "div[class*='tableEx'] .tableExCellsGroup .row",
      "div[class*='bodyCells'] .row",
      ".pivotTable .row",
      ".tableEx .row",
      "[aria-label*='テーブル'] [role='row']",
      "[role='grid'] [role='row']",
      "table tr",
    ];

    let rows = [];
    for (const sel of tableSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        rows = Array.from(found);
        break;
      }
    }

    // テーブルが見つからない場合はテキスト全体を返す
    if (rows.length === 0) {
      return { raw: document.body.innerText, rows: [] };
    }

    for (const row of rows) {
      const cells = Array.from(
        row.querySelectorAll("td, [role='gridcell'], .cell")
      );
      const texts = cells.map((c) => c.innerText?.trim() ?? "");
      if (texts.some((t) => t.length > 0)) {
        results.push(texts);
      }
    }

    return { raw: null, rows: results };
  });
}

/** テキスト全体から入港情報を正規表現で抽出（フォールバック） */
function parseRawText(raw) {
  const arrivals = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 船名らしい行を探す（カタカナ・英字を含み、日付が近くにある）
    const dateMatch = line.match(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/) ||
                      (lines[i + 1] && lines[i + 1].match(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/));
    if (!dateMatch) continue;

    const context = lines.slice(Math.max(0, i - 2), i + 5).join(" ");
    const dateStr = normalizeDate(
      context.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/)?.[1]
    );
    if (!dateStr) continue;

    arrivals.push({
      id: `scraped-${dateStr}-${i}`,
      shipName: line,
      shipNameEn: "",
      operator: "",
      terminal: normalizeTerminal(context),
      arrivalDate: dateStr,
      departureDate: dateStr,
      grossTonnage: "",
      passengers: 0,
      length: "",
      builtYear: 0,
      flag: "🚢",
      type: "クルーズ客船",
    });
  }

  return arrivals;
}

/** テーブル行配列からデータをパース */
function parseTableRows(rows) {
  if (rows.length === 0) return [];

  // ヘッダー行を推測
  const header = rows[0].map((h) => h.toLowerCase());
  const arrivals = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c === "")) continue;

    const get = (keywords) => {
      for (const kw of keywords) {
        const idx = header.findIndex((h) => h.includes(kw));
        if (idx >= 0 && row[idx]) return row[idx];
      }
      // ヘッダーが不明な場合はインデックスで推測
      return row.find((c) => c.length > 0) ?? "";
    };

    const shipName =
      get(["船名", "ship", "vessel", "客船"]) || row[0] || "";
    const arrivalRaw =
      get(["入港", "arrival", "着", "入"]) || row[1] || "";
    const departureRaw =
      get(["出港", "departure", "発", "出"]) || row[2] || "";
    const terminalRaw =
      get(["ターミナル", "terminal", "バース", "berth"]) || "";

    const arrivalDate = normalizeDate(arrivalRaw) ?? normalizeDate(row.find((c) => /\d{4}[\/\-]\d/.test(c)) ?? null);
    if (!shipName || !arrivalDate) continue;

    arrivals.push({
      id: `scraped-${arrivalDate}-${i}`,
      shipName: shipName.trim(),
      shipNameEn: "",
      operator: get(["運航", "operator", "会社", "ライン"]) || "",
      terminal: normalizeTerminal(terminalRaw),
      arrivalDate,
      departureDate: normalizeDate(departureRaw) ?? arrivalDate,
      arrivalTime: get(["入港時", "arrival time"]) || undefined,
      departureTime: get(["出港時", "departure time"]) || undefined,
      grossTonnage: get(["トン", "gt", "gross"]) || "",
      passengers: 0,
      length: "",
      builtYear: 0,
      flag: "🚢",
      type: "クルーズ客船",
    });
  }

  return arrivals;
}

async function main() {
  console.log("🚢 晴海客船ターミナル スクレイパー 開始");
  console.log(`📡 URL: ${POWER_BI_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "ja-JP",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let arrivals = [];

  try {
    console.log("⏳ ページ読み込み中...");
    await page.goto(POWER_BI_URL, { waitUntil: "networkidle", timeout: 60000 });

    // Power BI のレンダリング完了を待つ
    console.log("⏳ Power BI レンダリング待機中（最大60秒）...");
    await page.waitForTimeout(8000);

    // ローディングスピナーが消えるまで待つ
    try {
      await page.waitForSelector(
        "[class*='loading'], [class*='spinner'], [aria-label*='読み込み']",
        { state: "hidden", timeout: 30000 }
      );
    } catch {
      // タイムアウトは無視してそのまま続行
    }

    // さらにレンダリング待機
    await page.waitForTimeout(5000);

    // スクリーンショット保存（デバッグ用）
    await page.screenshot({ path: "scripts/debug-screenshot.png", fullPage: true });
    console.log("📸 デバッグ用スクリーンショット保存: scripts/debug-screenshot.png");

    // テーブルデータ抽出
    console.log("🔍 データ抽出中...");
    const extracted = await extractTableData(page);

    if (extracted.rows.length > 0) {
      console.log(`✅ テーブル行数: ${extracted.rows.length}`);
      arrivals = parseTableRows(extracted.rows);
    } else if (extracted.raw) {
      console.log("⚠️  テーブルが見つからない。テキスト全体から解析します...");
      arrivals = parseRawText(extracted.raw);
    }

    console.log(`📦 抽出された入港数: ${arrivals.length}`);
  } catch (err) {
    console.error("❌ スクレイピングエラー:", err.message);
  } finally {
    await browser.close();
  }

  // 既存データを読み込む（スクレイプ失敗時は既存を維持）
  let existing = { arrivals: [] };
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf-8"));
  } catch {
    // 初回実行時は無視
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    source: arrivals.length > 0 ? "scraper" : "scraper_empty",
    arrivals: arrivals.length > 0 ? arrivals : existing.arrivals,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`💾 保存完了: ${OUTPUT_PATH}`);
  console.log(`   入港データ: ${output.arrivals.length}件`);
  console.log(`   更新日時: ${output.lastUpdated}`);

  if (arrivals.length === 0) {
    console.warn("⚠️  データが取得できませんでした。");
    console.warn("   scripts/debug-screenshot.png を確認してください。");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
