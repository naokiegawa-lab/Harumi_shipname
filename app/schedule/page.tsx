import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { getScheduleData } from "@/lib/getScheduleData";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export const metadata: Metadata = {
  title: "入港カレンダー — 晴海フェリーターミナル",
  description: "2026年4月の東京港（晴海・東京国際クルーズターミナル）入港予定カレンダー",
};

export default function SchedulePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors text-sm font-medium"
          >
            <span>←</span>
            <span className="hidden sm:inline">船舶一覧に戻る</span>
            <span className="sm:hidden">戻る</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-sm font-medium text-slate-700">入港カレンダー</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 hidden sm:inline">自動更新中</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <section className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            入港予定カレンダー
          </h1>
        </section>

        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400 space-y-1">
          <p>晴海フェリーターミナル 接岸船舶情報システム</p>
          <p>
            スケジュール出典:{" "}
            <a
              href="https://app.powerbi.com/view?r=eyJrIjoiZDcxNWQ1YTYtYzYyOS00ZTM3LWJhOTctMmNlZDFmY2Y2OGE2IiwidCI6ImQwMzAyZmNjLTNlODEtNDljMy04MjM1LWQzMTFhMzY4NGNmYyJ9"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-sky-500"
            >
              東京都港湾局 入港予定ダッシュボード
            </a>
          </p>
          <p>※ 実際の運航状況とは異なる場合があります。最新情報は各運航会社にご確認ください。</p>
        </div>
      </footer>
    </div>
  );
}

async function ScheduleContent() {
  await connection();
  const data = await getScheduleData();

  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  const harumi = data.arrivals.filter(
    (a) => a.terminal === "晴海客船ターミナル"
  ).length;
  const international = data.arrivals.filter(
    (a) => a.terminal === "東京国際クルーズターミナル"
  ).length;

  const lastUpdatedStr = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const sourceLabel: Record<typeof data.source, { label: string; color: string }> = {
    scraper:       { label: "自動取得（最新）", color: "text-emerald-600" },
    scraper_empty: { label: "自動取得（データなし）", color: "text-amber-600" },
    manual:        { label: "手動データ", color: "text-slate-500" },
    fallback:      { label: "静的データ（フォールバック）", color: "text-slate-400" },
  };
  const src = sourceLabel[data.source] ?? sourceLabel.fallback;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 -mt-4 mb-6">
        <p className="text-slate-500 text-sm">
          2026年4月 — 東京港（晴海・有明）への入港スケジュール
        </p>
        {lastUpdatedStr && (
          <span className={`text-xs px-2 py-0.5 bg-slate-100 rounded-full ${src.color}`}>
            {src.label} · {lastUpdatedStr} 更新
          </span>
        )}
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in-delay">
        <StatCard label="4月の入港数" value={`${data.arrivals.length}件`} icon="🚢" color="slate" />
        <StatCard label="晴海入港" value={`${harumi}件`} icon="⚓" color="sky" />
        <StatCard label="国際ターミナル" value={`${international}件`} icon="🌍" color="violet" />
        <StatCard label="最大旅客数" value="4,500名" icon="👥" color="amber" />
      </section>

      {/* Calendar */}
      <section className="animate-fade-in-delay">
        <ScheduleCalendar arrivals={data.arrivals} todayStr={todayStr} />
      </section>
    </>
  );
}

function ScheduleSkeleton() {
  return (
    <>
      <div className="h-6 w-80 bg-slate-100 rounded animate-pulse -mt-4 mb-6" />
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4 animate-pulse bg-slate-50 h-24" />
        ))}
      </section>
      <div className="rounded-2xl border border-slate-200 h-96 animate-pulse bg-slate-50" />
    </>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: string; color: "slate" | "sky" | "violet" | "amber";
}) {
  const colorMap = {
    slate:  "bg-slate-50 border-slate-200 text-slate-700",
    sky:    "bg-sky-50 border-sky-200 text-sky-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    amber:  "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
