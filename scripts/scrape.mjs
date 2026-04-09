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
      await page.waitForTimeout(8000);
      console.log("⏳ 一覧表示レンダリング待機（8秒）...");
    } else {
      console.warn("⚠️  「一覧表示」ボタンが見つかりませんでした。カレンダービューで試みます。");
    }

    // 一覧表示後のスクリーンショット
    await page.screenshot({ path: SCREENSHOT_LIST_PATH, fullPage: false });
    console.log(`📸 一覧表示後のスクリーンショット保存`);

    // スクロールしながら全行を収集
    console.log("📜 テーブルをスクロールして全行を収集...");
    const allRowTexts = await scrollAndCollectAllRows(page);
    console.log(`  収集した行テキスト: ${allRowTexts.length} 件`);

    // テーブルデータを抽出（スクロール収集がある場合はそちらを優先）
    const { rows, selector } = allRowTexts.length > 0
      ? { rows: [[{ text: "__scroll__", bgColor: "" }], ...allRowTexts.map(t => [{ text: t, bgColor: "" }])], selector: "scroll" }
      : await extractFromListView(page);

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
 * Power BI テーブルをスクロールしながら全行テキストを収集
 */
async function scrollAndCollectAllRows(page) {
  const collected = new Set();
  let noNewRowsCount = 0;

  for (let attempt = 0; attempt < 20; attempt++) {
    // 現在表示されている行を取得
    const rowTexts = await page.evaluate(() => {
      const rows = document.querySelectorAll('[role="row"]');
      const results = [];
      for (const row of rows) {
        const text = row.textContent?.trim() ?? "";
        if (text.startsWith("行の選択") && text.length > 15) {
          results.push(text);
        }
      }
      return results;
    });

    const sizeBefore = collected.size;
    for (const t of rowTexts) collected.add(t);
    const newRows = collected.size - sizeBefore;
    console.log(`  スクロール ${attempt + 1}: ${rowTexts.length} 行表示, ${newRows} 行追加 (合計 ${collected.size})`);

    if (newRows === 0) {
      noNewRowsCount++;
      if (noNewRowsCount >= 3) break; // 3回連続で新規行なし → 終了
    } else {
      noNewRowsCount = 0;
    }

    // スクロール実行
    const scrolled = await page.evaluate(() => {
      // Power BI テーブルのスクロール対象を探す
      const candidates = [
        ...document.querySelectorAll('[class*="bodyCells"]'),
        ...document.querySelectorAll('[class*="tableEx"]'),
        ...document.querySelectorAll('[role="region"]'),
        ...document.querySelectorAll('[class*="mid-viewport"]'),
      ];
      for (const el of candidates) {
        if (el.scrollHeight > el.clientHeight + 10) {
          const before = el.scrollTop;
          el.scrollTop += 600;
          if (el.scrollTop !== before) return true;
        }
      }
      // フォールバック: ページ全体をスクロール
      const before = window.scrollY;
      window.scrollBy(0, 600);
      return window.scrollY !== before;
    });

    await page.waitForTimeout(1200);
    if (!scrolled && noNewRowsCount >= 1) break;
  }

  return [...collected];
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

  // 日付・時刻以降のテキストを取得（ターミナル＋前港＋次港が含まれる）
  const lastTime = times[times.length - 1];
  const lastDate = dates[dates.length - 1];
  const afterIdx = lastTime
    ? lastTime.index + lastTime[0].length
    : lastDate.index + lastDate[0].length;
  const trailingText = text.slice(afterIdx).trim();

  // ターミナル名を特定
  let terminal = "東京国際クルーズターミナル"; // デフォルト
  let portText = "";
  if (trailingText.includes("晴海客船ターミナル")) {
    terminal = "晴海客船ターミナル";
    portText = trailingText.slice(trailingText.indexOf("晴海客船ターミナル") + "晴海客船ターミナル".length);
  } else if (trailingText.includes("東京国際クルーズターミナル")) {
    terminal = "東京国際クルーズターミナル";
    portText = trailingText.slice(trailingText.indexOf("東京国際クルーズターミナル") + "東京国際クルーズターミナル".length);
  } else {
    const portMatch = trailingText.match(/^([^\s]+)/);
    if (portMatch && portMatch[1].length > 1) terminal = portMatch[1];
  }

  // 前港・次港を抽出（ターミナル名の後に連結されている）
  const { previousPort, nextPort } = splitPorts(portText);

  return {
    shipName,
    shipNameEn: "",
    operator: "",
    terminal,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    previousPort: previousPort || undefined,
    nextPort: nextPort || undefined,
    grossTonnage: "",
    passengers: 0,
    length: "",
    builtYear: 0,
    flag: "🚢",
    type: "クルーズ客船",
  };
}

/**
 * 連結された前港・次港テキストを分割する
 * 例: "清水大阪" → { previousPort: "清水", nextPort: "大阪" }
 */
const KNOWN_PORTS = [
  // 長い名前を先にマッチさせる（greedy）
  "カロリン諸島", "大東諸島", "伊勢志摩",
  "八重根漁港", "神湊漁港", "阿古漁港", "大久保漁港",
  "二見港", "岡田港", "神湊港", "八丈島",
  "横浜", "清水", "大阪", "名古屋", "神戸", "仙台",
  "大洗", "館山", "熱海", "東京", "石巻", "浜島",
  "宮之浦", "大久保", "広島", "高知", "鹿児島",
  "那覇", "金沢", "新潟", "函館", "小樽", "釧路",
  "青森", "秋田", "酒田", "境港", "舞鶴", "別府",
  "宮崎", "室蘭", "網走", "稚内", "長崎", "佐世保",
  "下関", "徳島", "高松", "松山", "博多", "奄美",
  "石垣", "基隆", "上海", "釜山", "済州", "香港",
  "ウラジオストク", "ペトロパブロフスク",
];

function splitPorts(text) {
  // "初入港" や "ゾディアック" 等の注記を除去
  const cleaned = text.replace(/初入港/g, "").replace(/ゾディアック/g, "").replace(/\//g, "").trim();
  if (!cleaned) return { previousPort: "", nextPort: "" };

  // 先頭から既知の港名を貪欲マッチ
  let previousPort = "";
  let remainder = cleaned;
  for (const port of KNOWN_PORTS) {
    if (remainder.startsWith(port)) {
      previousPort = port;
      remainder = remainder.slice(port.length);
      break;
    }
  }

  let nextPort = "";
  for (const port of KNOWN_PORTS) {
    if (remainder.startsWith(port)) {
      nextPort = port;
      break;
    }
  }

  // 既知の港名にマッチしなかった場合、テキストを半分に分割
  if (!previousPort && cleaned.length >= 2) {
    const mid = Math.ceil(cleaned.length / 2);
    previousPort = cleaned.slice(0, mid);
    nextPort = cleaned.slice(mid);
  }

  return { previousPort, nextPort };
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
