import { Schedule } from "@/data/ships";

type Props = {
  schedules: Schedule[];
};

const scheduleStatusConfig: Record<
  Schedule["status"],
  { label: string; className: string }
> = {
  定刻: { label: "定刻", className: "bg-emerald-50 text-emerald-700" },
  遅延: { label: "遅延", className: "bg-amber-50 text-amber-700" },
  欠航: { label: "欠航", className: "bg-red-50 text-red-700" },
  到着済: { label: "到着済", className: "bg-slate-100 text-slate-500" },
  出港準備中: { label: "出港準備中", className: "bg-amber-50 text-amber-700" },
};

export default function ScheduleTable({ schedules }: Props) {
  if (schedules.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-4 text-center">
        スケジュール情報はありません
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-1">
              日付
            </th>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-1">
              出発
            </th>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-1">
              到着
            </th>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-1">
              状態
            </th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => {
            const status = scheduleStatusConfig[schedule.status];
            const date = new Date(schedule.departure);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;

            return (
              <tr
                key={schedule.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 px-1 font-medium text-slate-700">
                  {dateStr}
                </td>
                <td className="py-3 px-1">
                  <div className="font-semibold text-slate-800">
                    {schedule.departureTime}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[120px]">
                    {schedule.departurePort}
                  </div>
                </td>
                <td className="py-3 px-1">
                  <div className="font-semibold text-slate-800">
                    {schedule.arrivalTime}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[120px]">
                    {schedule.arrivalPort}
                  </div>
                </td>
                <td className="py-3 px-1">
                  <div>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                    {schedule.delay && (
                      <div className="text-xs text-amber-600 mt-0.5">
                        {schedule.delay}遅延
                      </div>
                    )}
                    {schedule.note && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {schedule.note}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
