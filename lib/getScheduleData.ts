import { cacheTag, cacheLife } from "next/cache";
import { april2026Schedule, PortArrival } from "@/data/schedule";

export type ScrapedData = {
  lastUpdated: string | null;
  source: "scraper" | "scraper_empty" | "manual" | "fallback";
  arrivals: PortArrival[];
};

// パスは path.join(process.cwd(), "data", "scraped.json") と直書きすること。
// 変数や配列展開にすると Vercel のファイルトレースが追えず、本番に同梱されない
// （next.config.ts の outputFileTracingIncludes でも明示している）

/** scraped.json の更新時刻（ミリ秒）。取得できなければ 0 */
async function getScrapedMtimeMs(): Promise<number> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const stat = await fs.stat(path.join(process.cwd(), "data", "scraped.json"));
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

/** scrape結果JSONを読み込む（サーバーサイドのみ） */
async function loadScrapedJson(): Promise<ScrapedData> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "scraped.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw) as ScrapedData;
    if (!json.arrivals || json.arrivals.length === 0) {
      return { lastUpdated: json.lastUpdated, source: "fallback", arrivals: april2026Schedule };
    }
    return json;
  } catch {
    return { lastUpdated: null, source: "fallback", arrivals: april2026Schedule };
  }
}

/**
 * scraped.json の更新時刻を引数（= キャッシュキー）に含めてキャッシュする。
 * ファイルが差し替わった（git pull / 再デプロイ）ときに TTL を待たず再読込される。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- キャッシュキーとしてのみ使用
async function getCachedScheduleData(_mtimeMs: number): Promise<ScrapedData> {
  "use cache";
  cacheTag("schedule");
  cacheLife("hours"); // 1時間 TTL
  return loadScrapedJson();
}

/**
 * スケジュールデータ取得（use cache + cacheTag でタグ付きキャッシュ）
 * revalidateTag("schedule", "max") で即時無効化可能
 */
export async function getScheduleData(): Promise<ScrapedData> {
  return getCachedScheduleData(await getScrapedMtimeMs());
}
