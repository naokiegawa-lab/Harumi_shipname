/**
 * POST /api/scrape
 * スクレイピングを手動またはVercel Cronからトリガーします。
 * Authorization: Bearer <SCRAPE_SECRET> が必要
 *
 * Vercel Cron は Authorization ヘッダーを自動付与します。
 * 手動実行: curl -X POST https://your-domain.vercel.app/api/scrape \
 *             -H "Authorization: Bearer YOUR_SECRET"
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SCRAPE_SECRET = process.env.SCRAPE_SECRET ?? "";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  // シークレット認証（Vercel Cronは自動でセットする）
  const auth = req.headers.get("authorization") ?? "";
  if (SCRAPE_SECRET && auth !== `Bearer ${SCRAPE_SECRET}`) {
    return unauthorized();
  }

  try {
    // Node.js ランタイムで Playwright を実行
    // ※ Vercel Serverless では child_process でスクリプトを呼び出す
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const scriptPath = path.join(process.cwd(), "scripts", "scrape.mjs");

    let stdout = "";
    let stderr = "";
    let success = false;

    try {
      const result = await execFileAsync("node", [scriptPath], {
        timeout: 90_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
      success = true;
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string; message?: string };
      stdout = execErr.stdout ?? "";
      stderr = execErr.stderr ?? execErr.message ?? "Unknown error";
      success = false;
    }

    // キャッシュを無効化してページを再生成
    revalidateTag("schedule", "max");

    // 最新データを読み込んで返す
    const dataPath = path.join(process.cwd(), "data", "scraped.json");
    const scraped = JSON.parse(await fs.readFile(dataPath, "utf-8"));

    return NextResponse.json({
      ok: success,
      lastUpdated: scraped.lastUpdated,
      count: scraped.arrivals.length,
      source: scraped.source,
      log: stdout.slice(-2000), // 最後の2000文字のみ
      error: stderr.slice(-1000) || null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/** GET /api/scrape — 現在のスクレイプ状態を返す */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (SCRAPE_SECRET && auth !== `Bearer ${SCRAPE_SECRET}`) {
    return unauthorized();
  }

  try {
    const dataPath = path.join(process.cwd(), "data", "scraped.json");
    const scraped = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    return NextResponse.json({
      lastUpdated: scraped.lastUpdated,
      count: scraped.arrivals.length,
      source: scraped.source,
    });
  } catch {
    return NextResponse.json({ lastUpdated: null, count: 0, source: "none" });
  }
}
