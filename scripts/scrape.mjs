/**
 * 晴海客船ターミナル スクレイパー
 * 東京都港湾局 Power BI ダッシュボード（CRUISE CALL CALENDAR）から
 * 「一覧表示」ボタンでテーブルに切り替えてデータを取得します。
 *
 * 使い方:
 *   node scripts/scrape.mjs
 */

import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "scraped.json");
const SCREENSHOT_PATH = path.join(__dirname, "debug-screenshot.png");
const SCREENSHOT_LIST_PATH = path.join(__dirname, "debug-screenshot-list.png");

const POWER_BI_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiZDcxNWQ1YTYtYzYyOS00ZTM3LWJhOTctMmNlZDFmY2Y2OGE2IiwidCI6ImQwMzAyZmNjLTNlODEtNDljMy04MjM1LWQzMTFhMzY4NGNmYyJ9";

// 港名とターミナル種別のマッピング
const TERMINAL_MAP = {
  "東京国際クルーズターミナル": "東京国際クルーズターミナル",
  "晴海客船ターミナル": "晴海客船ターミナル",
  "harumi": "晴海客船ターミナル",
  "international": "東京国際クルーズターミナル",
};

function normalizeTerminal(raw) {
  if (!raw) return "東京国際クルーズターミナル";
  for (const [key, val] of Object.entries(TERMINAL_MAP)) {
    if (raw.includes(key)) return val;
  }
  return raw.trim();
}

function normalizeDate(raw) {
  if (!raw) return null;
  // "2026/4/6" or "2026-4-6"
  const m = raw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // "4月6日"
  const m2 = raw.match(/(\d{1,2})月(\d{1,2})日/);
  if (m2) {
    const year = new Date().getFullYear();
    return `${year}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

/** カレンダービューから全日程のデータを抽出 */
async function extractFromCalendar(page) {
  const arrivals = [];

  // カレンダー上のすべての船エントリを収集
  // Power BIのカレンダービジュアルのセルを探す
  const entries = await page.evaluate(() => {
    const results = [];

    // Power BI visual のテキスト要素を全取得
    const allText = document.querySelectorAll(
      "text, [class*='label'], [class*='cell'], [class*='calendar'] span, " +
      "div[class*='visual'] span, div[class*='matrix'] span"
    );

    for (const el of allText) {
      const text = el.textContent?.trim();
      if (!text || text.length < 2) continue;

      // 日付ぽいテキスト
      if (/^\d{1,2}日?$/.test(text)) continue;
      // 港名の凡例等はスキップ
      if (["JP", "EN", "すべて", "リセット", "一覧表示", "今日"].includes(text)) continue;
      // 色情報を取得（クラスやスタイルから）
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const color = style.color;

      // 親要素から日付を探す
      let dateText = null;
      let el2 = el.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!el2) break;
        const innerText = el2.innerText ?? "";
        const dateMatch = innerText.match(/(\d{1,2})[日]?[\s\n]/);
        if (dateMatch) {
          dateText = dateMatch[1];
          break;
        }
        el2 = el2.parentElement;
      }

      results.push({
        text,
        bgColor,
        color,
        dateText,
        tagName: el.tagName,
        className: el.className,
      });
    }

    return results;
  });

  console.log(`  カレンダーから ${entries.length} 件のテキスト要素を取得`);
  return entries;
}

/** 一覧表示テーブルからデータを抽出 */
async function extractFromListView(page) {
  const arrivals = [];

  // テーブルの行を収集
  const rows = await page.evaluate(() => {
    const results = [];

    // Power BI テーブルビジュアルの行を探す
    const selectors = [
      // Power BI の標準テーブルビジュアル
      ".tableEx .rowsGroup .row",
      ".pivotTable .bodyCells .row",
      "[class*='tableEx'] [class*='row']",
      "[class*='bodyCells'] [class*='row']",
      // Power BI Matrix
      "[role='row']",
      "tr",
    ];

    let rows = [];
    let usedSelector = "";
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 1) { // ヘッダー除く
        rows = Array.from(found);
        usedSelector = sel;
        break;
      }
    }

    for (const row of rows) {
      const cells = row.querySelectorAll(
        "td, [role='gridcell'], [class*='cell'], [class*='Cell']"
      );
      const texts = Array.from(cells).map((c) => ({
        text: c.textContent?.trim() ?? "",
        bgColor: window.getComputedStyle(c).backgroundColor,
      }));
      if (texts.some((t) => t.text.length > 0)) {
        results.push(texts);
      }
    }

    return { rows: results, selector: usedSelector };
  });

  console.log(`  テーブル行数: ${rows.rows.length} (セレクタ: ${rows.selector})`);
  return rows;
}

/** ページ全体のテキストを構造化して取得 */
async function extractAllText(page) {
  return await page.evaluate(() => {
    // Power BI の visual コンテナを探す
    const visuals = document.querySelectorAll(
      "[class*='visual'], [data-testid], [aria-label]"
    );
    const results = [];

    for (const v of visuals) {
      const text = v.innerText?.trim();
      if (text && text.length > 10) {
        results.push({
          tag: v.tagName,
          ariaLabel: v.getAttribute("aria-label") ?? "",
          text: text.slice(0, 500),
        });
      }
    }

    return results;
  });
}

async function main() {
  console.log("🚢 晴海客船ターミナル スクレイパー 開始");
  console.log(`📡 URL: ${POWER_BI_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",  // GitHub Actions の /dev/shm 64MB制限対策
      "--disable-gpu",
    ],
  });
  const context = await browser.newContext({
    locale: "ja-JP",
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let arrivals = [];

  try {
    console.log("⏳ ページ読み込み中...");
    await page.goto(POWER_BI_URL, { waitUntil: "networkidle", timeout: 60000 });

    console.log("⏳ Power BI 初期レンダリング待機（15秒）...");
    await page.waitForTimeout(15000);

    // スクリーンショット（カレンダービュー）
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    console.log(`📸 カレンダービューのスクリーンショット保存`);

    // 「一覧表示」ボタンを探してクリック
    console.log("🔍 「一覧表示」ボタンを探しています...");
    const listViewButton = await page.getByText("一覧表示").first();

    if (await listViewButton.isVisible()) {
      console.log("✅ 「一覧表示」ボタンが見つかりました。クリックします...");
      await listViewButton.click();
      await page.waitForTimeout(5000);
      console.log("⏳ 一覧表示レンダリング待機（5秒）...");
    } else {
      console.warn("⚠️  「一覧表示」ボタンが見つかりませんでした。カレンダービューで試みます。");
    }

    // 一覧表示後のスクリーンショット
    await page.screenshot({ path: SCREENSHOT_LIST_PATH, fullPage: false });
    console.log(`📸 一覧表示後のスクリーンショット保存`);

    // ページのテキスト全体を取得して内容を確認
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log("\n--- ページテキスト（先頭1000文字）---");
    console.log(pageText.slice(0, 1000));
    console.log("---\n");

    // テーブルデータを抽出
    const { rows, selector } = await extractFromListView(page);

    if (rows.length > 1) {
      console.log(`✅ テーブルデータ取得: ${rows.length} 行`);
      // ヘッダー行
      const header = rows[0].map((c) => c.text.toLowerCase());
      console.log("  ヘッダー:", header.join(" | "));

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const texts = row.map((c) => c.text);

        // Power BI が全データを1セルに連結している場合（"行の選択" プレフィックスで判定）
        const firstText = texts.find(t => t.length > 0) ?? "";
        if (firstText.startsWith("行の選択") && firstText.length > 10) {
          const entry = parseRowText(firstText);
          if (entry) arrivals.push({ id: `scraped-${entry.arrivalDate}-${i}`, ...entry });
          continue;
        }

        // 複数セルがある場合：列インデックスを推測
        const findIdx = (...keywords) => {
          for (const kw of keywords) {
            const idx = header.findIndex((h) => h.includes(kw));
            if (idx >= 0) return idx;
          }
          return -1;
        };

        const shipIdx = findIdx("客船", "船名", "ship", "vessel");
        const arrivalDateIdx = findIdx("到着日", "入港日", "arrival", "到着");
        const departureDateIdx = findIdx("出発日", "出港日", "departure", "出発");
        const arrivalTimeIdx = findIdx("到着時刻", "入港時刻", "到着時間");
        const departureTimeIdx = findIdx("出発時刻", "出港時刻", "出発時間");
        const terminalIdx = findIdx("港名", "ターミナル", "terminal", "港");

        const shipName = shipIdx >= 0 ? texts[shipIdx] : texts[0];
        const arrivalDate = normalizeDate(
          arrivalDateIdx >= 0 ? texts[arrivalDateIdx] : null
        );
        const departureDate = normalizeDate(
          departureDateIdx >= 0 ? texts[departureDateIdx] : null
        );
        const terminal = normalizeTerminal(
          terminalIdx >= 0 ? texts[terminalIdx] : ""
        );

        if (!shipName || shipName === "行の選択") continue;
        if (!arrivalDate) continue;

        arrivals.push({
          id: `scraped-${arrivalDate}-${i}`,
          shipName: shipName.trim(),
          shipNameEn: "",
          operator: "",
          terminal,
          arrivalDate,
          departureDate: departureDate ?? arrivalDate,
          arrivalTime: arrivalTimeIdx >= 0 ? texts[arrivalTimeIdx] : undefined,
          departureTime: departureTimeIdx >= 0 ? texts[departureTimeIdx] : undefined,
          grossTonnage: "",
          passengers: 0,
          length: "",
          builtYear: 0,
          flag: "🚢",
          type: "クルーズ客船",
        });
      }
    } else {
      // テーブルが見つからない場合、ページテキストを解析
      console.warn("⚠️  テーブルが見つからない。ページテキストを解析します...");
      arrivals = parseFromPageText(pageText);
    }

    console.log(`\n📦 抽出された入港数: ${arrivals.length}`);
    if (arrivals.length > 0) {
      console.log("  サンプル:", JSON.stringify(arrivals[0], null, 2));
    }

  } catch (err) {
    console.error("❌ スクレイピングエラー:", err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }

  // 既存データを読み込む（スクレイプ失敗時は既存を維持）
  let existing = { arrivals: [] };
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf-8"));
  } catch { /* 初回 */ }

  const output = {
    lastUpdated: new Date().toISOString(),
    source: arrivals.length > 0 ? "scraper" : "scraper_empty",
    arrivals: arrivals.length > 0 ? arrivals : existing.arrivals,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n💾 保存完了: ${OUTPUT_PATH}`);
  console.log(`   入港データ: ${output.arrivals.length}件`);
  console.log(`   更新日時: ${output.lastUpdated}`);

  process.exit(arrivals.length > 0 ? 0 : 1);
}

/** ページテキストから日本語の船名・日付を抽出（フォールバック） */
function parseFromPageText(text) {
  const arrivals = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 日付のパターン
  const datePattern = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;

  let currentDate = null;
  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      currentDate = normalizeDate(dateMatch[0]);
      continue;
    }
    // 船名っぽい行（カタカナや英字を含み短い）
    if (currentDate && /[ァ-ヶA-Za-z]/.test(line) && line.length < 30) {
      arrivals.push({
        id: `scraped-${currentDate}-${arrivals.length}`,
        shipName: line,
        shipNameEn: "",
        operator: "",
        terminal: "東京国際クルーズターミナル",
        arrivalDate: currentDate,
        departureDate: currentDate,
        grossTonnage: "",
        passengers: 0,
        length: "",
        builtYear: 0,
        flag: "🚢",
        type: "クルーズ客船",
      });
    }
  }
  return arrivals;
}

/**
 * Power BI の1セル連結行テキストをパース
 * 例: "行の選択セレブリティ・ミレニアム2026/08/3005:302026/08/3016:30東京国際クルーズターミナル清水大阪"
 */
function parseRowText(rawText) {
  // "行の選択" プレフィックスを除去
  const text = rawText.replace(/^行の選択/, "").trim();
  if (!text) return null;

  // 日付を全て検索: 2026/MM/DD
  const dateRe = /\d{4}\/\d{1,2}\/\d{1,2}/g;
  const dates = [...text.matchAll(dateRe)];
  if (dates.length === 0) return null;

  // 最初の日付の前が船名
  const shipName = text.slice(0, dates[0].index).trim();
  if (!shipName || ["客船名", "すべて"].includes(shipName)) return null;

  // 時刻を全て検索: HH:MM
  const times = [...text.matchAll(/\d{2}:\d{2}/g)];

  const arrivalDate = normalizeDate(dates[0][0]);
  const departureDate = dates[1] ? normalizeDate(dates[1][0]) : arrivalDate;
  const arrivalTime = times[0]?.[0];
  const departureTime = times[1]?.[0];

  // ターミナル名を特定
  let terminal = "東京国際クルーズターミナル"; // デフォルト
  if (text.includes("晴海客船ターミナル")) {
    terminal = "晴海客船ターミナル";
  } else if (text.includes("東京国際クルーズターミナル")) {
    terminal = "東京国際クルーズターミナル";
  } else {
    // 既知ターミナル以外（離島港など）: 最後の日付以降のテキストから推測
    const lastDate = dates[dates.length - 1];
    const afterAll = text.slice(lastDate.index + lastDate[0].length)
      .replace(/\d{2}:\d{2}/g, "").trim();
    // 最初の区切り前が港名
    const portMatch = afterAll.match(/^([^\s]+)/);
    if (portMatch && portMatch[1].length > 1) terminal = portMatch[1];
  }

  return {
    shipName,
    shipNameEn: "",
    operator: "",
    terminal,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    grossTonnage: "",
    passengers: 0,
    length: "",
    builtYear: 0,
    flag: "🚢",
    type: "クルーズ客船",
  };
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
