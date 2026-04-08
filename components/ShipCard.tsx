import Link from "next/link";
import { Ship } from "@/data/ships";
import StatusBadge from "./StatusBadge";

type Props = {
  ship: Ship;
  index: number;
};

const typeColors: Record<string, string> = {
  フェリー: "bg-blue-100 text-blue-700",
  "クルーズ客船": "bg-purple-100 text-purple-700",
};

export default function ShipCard({ ship, index }: Props) {
  return (
    <Link href={`/ships/${ship.id}`}>
      <article
        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer animate-fade-in"
        style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
      >
        {/* Header gradient */}
        <div className="h-2 bg-gradient-to-r from-sky-400 to-blue-600" />

        <div className="p-6">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[ship.type] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {ship.type}
                </span>
                <span className="text-xs text-slate-400">{ship.berthNumber}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                {ship.flag} {ship.name}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">{ship.nameEn}</p>
            </div>
            <StatusBadge status={ship.status} size="sm" />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {ship.operator && <InfoItem label="運航会社" value={ship.operator} />}
            {ship.route && <InfoItem label="航路" value={ship.route} />}
            {ship.grossTonnage && <InfoItem label="総トン数" value={`${ship.grossTonnage} GT`} />}
            {ship.builtYear > 0 && <InfoItem label="就航年" value={`${ship.builtYear}年`} />}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {ship.capacity.passengers > 0 ? (
              <div className="text-xs text-slate-400">
                旅客定員:{" "}
                <span className="text-slate-600 font-medium">
                  {ship.capacity.passengers.toLocaleString()}名
                </span>
              </div>
            ) : (
              <div />
            )}
            <span className="text-xs text-sky-600 font-medium group-hover:underline">
              詳細を見る →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-700 truncate">{value}</dd>
    </div>
  );
}
