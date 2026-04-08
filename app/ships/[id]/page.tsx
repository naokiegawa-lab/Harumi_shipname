import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShipById } from "@/data/ships";
import { getScheduleData } from "@/lib/getScheduleData";
import StatusBadge from "@/components/StatusBadge";
import ScheduleTable from "@/components/ScheduleTable";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ship = getShipById(id);
  if (ship) return { title: `${ship.name} — 晴海フェリーターミナル`, description: ship.description };
  // スクレイプデータは "use cache" のため generateMetadata 内では呼べない（Suspense 外）
  return { title: "船舶詳細 — 晴海フェリーターミナル" };
}

export default async function ShipDetailPage({ params }: Props) {
  const { id } = await params;
  const staticShip = getShipById(id);

  // 静的データがある場合は既存UIで直接表示（Suspense 不要）
  if (staticShip) {
    return <StaticShipDetail ship={staticShip} />;
  }

  // スクレイプデータのみの場合は Suspense でラップ
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-400">読み込み中...</div>
        </div>
      }
    >
      <ScrapedShipDetail id={id} />
    </Suspense>
  );
}

async function ScrapedShipDetail({ id }: { id: string }) {
  const data = await getScheduleData();
  const arrival = data.arrivals.find((a) => a.id === id);
  if (!arrival) notFound();

  const today = new Date().toISOString().split("T")[0];
  const status =
    arrival.arrivalDate < today && arrival.departureDate === today ? "出港準備中" :
    arrival.arrivalDate < today && arrival.departureDate > today ? "停泊中" : "接岸中";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors text-sm font-medium">
            <span>←</span><span>船舶一覧に戻る</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-sm font-medium text-slate-700 truncate">{arrival.shipName}</span>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <section className="bg-gradient-to-br from-sky-600 to-blue-800 rounded-2xl p-8 mb-6 text-white animate-fade-in">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sky-200 text-sm font-medium mb-2">{arrival.terminal} · {arrival.type}</div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">{arrival.flag} {arrival.shipName}</h1>
              {arrival.shipNameEn && <p className="text-sky-200 text-lg">{arrival.shipNameEn}</p>}
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-sky-300 text-xs mb-1">入港日</p><p className="font-semibold">{arrival.arrivalDate}{arrival.arrivalTime ? ` ${arrival.arrivalTime}` : ""}</p></div>
            <div><p className="text-sky-300 text-xs mb-1">出港日</p><p className="font-semibold">{arrival.departureDate}{arrival.departureTime ? ` ${arrival.departureTime}` : ""}</p></div>
            {arrival.grossTonnage && <div><p className="text-sky-300 text-xs mb-1">総トン数</p><p className="font-semibold">{arrival.grossTonnage}</p></div>}
            {arrival.passengers > 0 && <div><p className="text-sky-300 text-xs mb-1">旅客定員</p><p className="font-semibold">{arrival.passengers.toLocaleString()}名</p></div>}
          </div>
        </section>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          ℹ️ このデータは東京都港湾局の入港予定から自動取得されたものです。詳細な船舶情報は各運航会社にお問い合わせください。
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400">
          <p>晴海フェリーターミナル 接岸船舶情報システム</p>
        </div>
      </footer>
    </div>
  );
}

type Ship = NonNullable<ReturnType<typeof getShipById>>;

function StaticShipDetail({ ship }: { ship: Ship }) {
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
          <span className="text-sm font-medium text-slate-700 truncate">
            {ship.name}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero section */}
        <section className="bg-gradient-to-br from-sky-600 to-blue-800 rounded-2xl p-8 mb-6 text-white animate-fade-in">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sky-200 text-sm font-medium mb-2 flex items-center gap-2">
                <span>{ship.berthNumber}</span>
                <span>·</span>
                <span>{ship.type}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">
                {ship.flag} {ship.name}
              </h1>
              <p className="text-sky-200 text-lg">{ship.nameEn}</p>
              <p className="text-sky-100 text-sm mt-2">{ship.operator}</p>
            </div>
            <StatusBadge status={ship.status} />
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center gap-2 text-sky-100">
              <span className="text-xl">🗺</span>
              <span className="text-sm font-medium">{ship.route}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card title="船舶について">
              <p className="text-slate-600 text-sm leading-relaxed">
                {ship.description}
              </p>
            </Card>

            {/* Specs */}
            <Card title="船舶仕様">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <SpecItem label="総トン数" value={ship.grossTonnage} />
                <SpecItem label="全長" value={ship.length} />
                <SpecItem label="全幅" value={ship.width} />
                <SpecItem label="就航年" value={`${ship.builtYear}年`} />
                <SpecItem label="船籍" value={ship.flag} />
                <SpecItem
                  label="旅客定員"
                  value={`${ship.capacity.passengers.toLocaleString()}名`}
                />
                {ship.capacity.vehicles && (
                  <SpecItem
                    label="車両積載"
                    value={`${ship.capacity.vehicles}台`}
                  />
                )}
                {ship.capacity.cargo && (
                  <SpecItem label="貨物" value={ship.capacity.cargo} />
                )}
              </dl>
            </Card>

            {/* Schedule */}
            <Card title="運航スケジュール">
              <ScheduleTable schedules={ship.schedules} />
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Current status */}
            <Card title="現在の状況">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">ステータス</span>
                  <StatusBadge status={ship.status} size="sm" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">係留バース</span>
                  <span className="font-medium text-slate-700">
                    {ship.berthNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm">
                  <span className="text-slate-500">運航会社</span>
                  <span className="font-medium text-slate-700">
                    {ship.operator}
                  </span>
                </div>
              </div>
            </Card>

            {/* Facilities */}
            <Card title="船内設備">
              <ul className="space-y-2">
                {ship.facilities.map((facility) => (
                  <li
                    key={facility}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                    {facility}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
