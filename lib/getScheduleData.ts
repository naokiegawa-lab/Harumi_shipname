import { cacheTag, cacheLife } from "next/cache";
import { april2026Schedule, PortArrival } from "@/data/schedule";

export type ScrapedData = {
  lastUpdated: string | null;
  source: "scraper" | "scraper_empty" | "manual" | "fallback";
  arrivals: PortArrival[];
};

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
 * スケジュールデータ取得（use cache + cacheTag でタグ付きキャッシュ）
 * revalidateTag("schedule", "max") で即時無効化可能
 */
export async function getScheduleData(): Promise<ScrapedData> {
  "use cache";
  cacheTag("schedule");
  cacheLife("hours"); // 1時間 TTL
  return loadScrapedJson();
}
