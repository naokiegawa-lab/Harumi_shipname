import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Ship } from "@/data/ships";
import type { PortArrival } from "@/data/schedule";
import { lookupShip } from "@/data/shipDatabase";
import { getScheduleData } from "@/lib/getScheduleData";
import ShipCard from "@/components/ShipCard";
import TodayDate from "@/components/TodayDate";

// ページ全体は静的シェルとして描画し、動的部分だけ Suspense でラップ
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚓</span>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                晴海フェリーターミナル
              </h1>
              <p className="text-xs text-slate-400">接岸船舶情報システム</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/schedule"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 hidden sm:inline"
            >
              📅 入港カレンダー
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500 hidden sm:inline">リアルタイム更新中</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <section className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            本日の接岸船舶
          </h2>
          <Suspense fallback={<p className="text-slate-400 text-sm">読み込み中...</p>}>
            <TodayDate />
          </Suspense>
        </section>

        {/* 動的コンテンツ（今日の船・統計）を Suspense でラップ */}
        <Suspense fallback={<ShipListSkeleton />}>
          <TodayShipSection />
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

/** JST の今日の日付を YYYY-MM-DD で返す */
function getTodayJST(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().split("T")[0];
}

/** PortArrival → ShipCard 用の Ship 形式に変換（shipDatabase で補完） */
function arrivalToShip(arrival: PortArrival, today: string): Ship {
  const status: Ship["status"] =
    arrival.arrivalDate < today && arrival.departureDate === today
      ? "出港準備中"
      : arrival.arrivalDate < today && arrival.departureDate > today
        ? "停泊中"
        : "接岸中";

  const timeLabel =
    arrival.arrivalTime || arrival.departureTime
      ? [
          arrival.arrivalTime ? `入港 ${arrival.arrivalTime}` : null,
          arrival.departureTime ? `出港 ${arrival.departureTime}` : null,
        ]
          .filter(Boolean)
          .join(" / ")
      : "";

  // データベースから補完
  const db = lookupShip(arrival.shipName);

  return {
    id: arrival.id,
    name: arrival.shipName,
    nameEn: arrival.shipNameEn || db?.nameEn || "",
    operator: arrival.operator || db?.operator || "",
    type: arrival.type,
    flag: (arrival.flag && arrival.flag !== "🚢" ? arrival.flag : null) ?? db?.flag ?? "🚢",
    grossTonnage: arrival.grossTonnage || db?.grossTonnage || "",
    length: arrival.length || db?.length || "",
    width: "",
    builtYear: arrival.builtYear || db?.builtYear || 0,
    capacity: { passengers: arrival.passengers || db?.passengers || 0 },
    route: timeLabel,
    status,
    berthNumber: arrival.terminal,
    image: "",
    description: "",
    schedules: [],
    facilities: [],
  };
}

/** connection() を使う動的セクション（Suspense 内で描画） */
async function TodayShipSection() {
  await connection(); // リクエスト時に Date.now() を使うため
  const data = await getScheduleData();
  const today = getTodayJST();

  const todayShips = data.arrivals
    .filter((a) => a.arrivalDate <= today && a.departureDate >= today)
    .map((a) => arrivalToShip(a, today));

  const docked = todayShips.filter((s) => s.status === "接岸中").length;
  const preparing = todayShips.filter((s) => s.status === "出港準備中").length;
  const anchored = todayShips.filter((s) => s.status === "停泊中").length;

  const monthLabel = new Date(today + "T00:00:00+09:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <>
      {/* Stats */}
      <section className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-delay">
        <StatCard label="接岸中" value={docked} color="emerald" />
        <StatCard label="出港準備中" value={preparing} color="amber" />
        <StatCard label="停泊中" value={anchored} color="sky" />
      </section>

      {/* Calendar banner */}
      <section className="mb-8">
        <Link
          href="/schedule"
          className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl px-6 py-4 hover:from-sky-600 hover:to-blue-700 transition-all shadow-sm group"
        >
          <div>
            <p className="font-bold text-base">📅 {monthLabel} 入港カレンダー</p>
            <p className="text-sky-100 text-xs mt-0.5">東京港の今月の全入港スケジュールをカレンダーで確認</p>
          </div>
          <span className="text-sky-200 group-hover:translate-x-1 transition-transform text-lg">→</span>
        </Link>
      </section>

      {/* Ship grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            全船舶一覧 — {todayShips.length}隻
          </h3>
          {data.lastUpdated && (
            <span className="text-xs text-slate-400">
              {new Date(data.lastUpdated).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })} 更新
            </span>
          )}
        </div>

        {todayShips.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🚢</p>
            <p className="font-medium">本日の入港予定はありません</p>
            <Link href="/schedule" className="text-sm text-sky-500 mt-2 inline-block hover:underline">
              入港カレンダーで今後の予定を確認 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {todayShips.map((ship, index) => (
              <ShipCard key={ship.id} ship={ship} index={index} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/** ローディング中のスケルトン */
function ShipListSkeleton() {
  return (
    <>
      <section className="grid grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4 text-center animate-pulse bg-slate-50 h-20" />
        ))}
      </section>
      <div className="rounded-2xl bg-slate-100 h-16 mb-8 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 h-48 animate-pulse bg-slate-50" />
        ))}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "sky";
}) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    sky: "text-sky-600 bg-sky-50 border-sky-200",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1 opacity-80">{label}</div>
    </div>
  );
}
