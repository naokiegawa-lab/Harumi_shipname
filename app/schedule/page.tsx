import Link from "next/link";
import type { Metadata } from "next";
import { april2026Schedule } from "@/data/schedule";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export const metadata: Metadata = {
  title: "入港カレンダー — 晴海フェリーターミナル",
  description: "2026年4月の東京港（晴海・東京国際クルーズターミナル）入港予定カレンダー",
};

export default function SchedulePage() {
  const harumi = april2026Schedule.filter(
    (a) => a.terminal === "晴海客船ターミナル"
  ).length;
  const international = april2026Schedule.filter(
    (a) => a.terminal === "東京国際クルーズターミナル"
  ).length;

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
          <span className="text-sm font-medium text-slate-700">
            入港カレンダー
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <section className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            入港予定カレンダー
          </h1>
          <p className="text-slate-500 text-sm">
            2026年4月 — 東京港（晴海・有明）への入港スケジュール
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in-delay">
          <StatCard
            label="4月の入港数"
            value={`${april2026Schedule.length}件`}
            icon="🚢"
            color="slate"
          />
          <StatCard
            label="晴海入港"
            value={`${harumi}件`}
            icon="⚓"
            color="sky"
          />
          <StatCard
            label="国際ターミナル"
            value={`${international}件`}
            icon="🌍"
            color="violet"
          />
          <StatCard
            label="最大旅客数"
            value="4,500名"
            icon="👥"
            color="amber"
          />
        </section>

        {/* Calendar */}
        <section className="animate-fade-in-delay">
          <ScheduleCalendar />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400 space-y-1">
          <p>晴海フェリーターミナル 接岸船舶情報システム</p>
          <p>
            スケジュール出典:{" "}
            <a
              href="https://www.tptc.co.jp/terminal/guide/harumi"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-sky-500"
            >
              東京港客船ターミナル
            </a>
            {" / "}
            <a
              href="https://www.cruise-mag.com/arrival-port/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-sky-500"
            >
              クルーズマガジン
            </a>
          </p>
          <p>※ 実際の運航状況とは異なる場合があります。最新情報は各運航会社にご確認ください。</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: "slate" | "sky" | "violet" | "amber";
}) {
  const colorMap = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
