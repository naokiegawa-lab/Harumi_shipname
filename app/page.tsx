import { ships } from "@/data/ships";
import ShipCard from "@/components/ShipCard";

export default function HomePage() {
  const docked = ships.filter((s) => s.status === "接岸中").length;
  const preparing = ships.filter((s) => s.status === "出港準備中").length;
  const anchored = ships.filter((s) => s.status === "停泊中").length;

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
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 hidden sm:inline">リアルタイム更新中</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <section className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            本日の接岸船舶
          </h2>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}{" "}
            現在
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-delay">
          <StatCard label="接岸中" value={docked} color="emerald" />
          <StatCard label="出港準備中" value={preparing} color="amber" />
          <StatCard label="停泊中" value={anchored} color="sky" />
        </section>

        {/* Ship grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              全船舶一覧 — {ships.length}隻
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ships.map((ship, index) => (
              <ShipCard key={ship.id} ship={ship} index={index} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400">
          <p>晴海フェリーターミナル 接岸船舶情報システム</p>
          <p className="mt-1">
            ※ 表示情報はデモデータです。実際の運航状況とは異なる場合があります。
          </p>
        </div>
      </footer>
    </div>
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
