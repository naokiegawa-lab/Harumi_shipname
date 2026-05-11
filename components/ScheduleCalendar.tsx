"use client";

import { useState } from "react";
import { PortArrival } from "@/data/schedule";
import { lookupShip } from "@/data/shipDatabase";

const TERMINAL_COLORS: Record<string, { bg: string; dot: string; border: string }> = {
  "晴海客船ターミナル": {
    bg: "bg-sky-50 hover:bg-sky-100",
    dot: "bg-sky-500",
    border: "border-sky-200",
  },
  "東京国際クルーズターミナル": {
    bg: "bg-violet-50 hover:bg-violet-100",
    dot: "bg-violet-500",
    border: "border-violet-200",
  },
};

const DEFAULT_COLOR = { bg: "bg-slate-50 hover:bg-slate-100", dot: "bg-slate-500", border: "border-slate-200" };

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type Props = {
  arrivals: PortArrival[];
  todayStr: string;
  /** 初期表示する年月（例: "2026-05"） */
  initialYearMonth: string;
};

function parseYM(ym: string): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m - 1]; // month は 0-indexed
}

export default function ScheduleCalendar({ arrivals, todayStr, initialYearMonth }: Props) {
  const [initYear, initMonth] = parseYM(initialYearMonth);
  const [viewYear, setViewYear] = useState<number>(initYear);
  const [viewMonth, setViewMonth] = useState<number>(initMonth);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  function goToMonth(deltaMonths: number) {
    let y = viewYear;
    let m = viewMonth + deltaMonths;
    while (m < 0) { y -= 1; m += 12; }
    while (m > 11) { y += 1; m -= 12; }
    setViewYear(y);
    setViewMonth(m);

    // 月切り替え時、選択日を再計算
    const newYM = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (todayStr.startsWith(newYM)) {
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(`${newYM}-01`);
    }
  }

  // Build map: dateStr -> arrivals
  const arrivalMap: Record<string, PortArrival[]> = {};
  for (const arrival of arrivals) {
    // Mark every day a ship is in port
    const start = new Date(arrival.arrivalDate);
    const end = new Date(arrival.departureDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!arrivalMap[key]) arrivalMap[key] = [];
      // avoid duplicates
      if (!arrivalMap[key].find((a) => a.id === arrival.id)) {
        arrivalMap[key].push(arrival);
      }
    }
  }

  const selectedArrivals = arrivalMap[selectedDate] ?? [];

  // Calendar cells
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Month header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToMonth(-1)}
              aria-label="前月"
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors"
            >
              ←
            </button>
            <h2 className="font-bold text-slate-800 text-lg whitespace-nowrap">
              {viewYear}年{viewMonth + 1}月 入港カレンダー
            </h2>
            <button
              onClick={() => goToMonth(1)}
              aria-label="次月"
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              晴海
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              国際
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_JA.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-2 ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const arrivals = arrivalMap[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayOfWeek = (firstDayOfWeek + day - 1) % 7;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative min-h-[60px] p-1.5 rounded-xl text-left transition-all
                    ${isSelected ? "ring-2 ring-sky-500 ring-offset-1" : ""}
                    ${isToday ? "bg-sky-50" : "hover:bg-slate-50"}
                    ${arrivals.length > 0 ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  <span
                    className={`
                      inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1
                      ${isToday ? "bg-sky-500 text-white" : ""}
                      ${dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : "text-slate-700"}
                      ${isToday ? "text-white" : ""}
                    `}
                  >
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {arrivals.slice(0, 3).map((a) => {
                      const color = TERMINAL_COLORS[a.terminal] ?? DEFAULT_COLOR;
                      return (
                        <span
                          key={a.id}
                          className={`block w-full truncate text-[9px] font-medium px-1 py-0.5 rounded ${color.bg} ${color.border} border`}
                          title={a.shipName}
                        >
                          {a.flag} {a.shipName.replace("・", "·").substring(0, 7)}
                        </span>
                      );
                    })}
                    {arrivals.length > 3 && (
                      <span className="text-[9px] text-slate-400 px-1">
                        +{arrivals.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">
              {(() => {
                const d = new Date(selectedDate + "T00:00:00");
                return `${d.getMonth() + 1}月${d.getDate()}日（${DAYS_JA[d.getDay()]}）`;
              })()}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedArrivals.length > 0
                ? `${selectedArrivals.length}隻が停泊中`
                : "入港予定なし"}
            </p>
          </div>

          {selectedArrivals.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              この日の入港予定はありません
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedArrivals.map((arrival) => {
                const color = TERMINAL_COLORS[arrival.terminal] ?? DEFAULT_COLOR;
                // shipDatabase で補完
                const db = lookupShip(arrival.shipName);
                const flag = (arrival.flag && arrival.flag !== "🚢" ? arrival.flag : null) ?? db?.flag ?? "🚢";
                const nameEn = arrival.shipNameEn || db?.nameEn || "";
                const operator = arrival.operator || db?.operator || "";
                const grossTonnage = arrival.grossTonnage || db?.grossTonnage || "";
                const passengers = arrival.passengers || db?.passengers || 0;
                return (
                  <li key={arrival.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {flag} {arrival.shipName}
                        </p>
                        {nameEn && <p className="text-xs text-slate-400">{nameEn}</p>}
                      </div>
                      <span
                        className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${color.bg} ${color.border} ${
                          arrival.terminal === "晴海客船ターミナル"
                            ? "text-sky-700"
                            : "text-violet-700"
                        }`}
                      >
                        {arrival.terminal === "晴海客船ターミナル" ? "晴海" : "国際"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {operator && (
                        <>
                          <span className="text-slate-400">運航会社</span>
                          <span className="text-slate-700 font-medium">{operator}</span>
                        </>
                      )}
                      {grossTonnage && (
                        <>
                          <span className="text-slate-400">総トン数</span>
                          <span className="text-slate-700 font-medium">{grossTonnage} GT</span>
                        </>
                      )}
                      {passengers > 0 && (
                        <>
                          <span className="text-slate-400">旅客定員</span>
                          <span className="text-slate-700 font-medium">{passengers.toLocaleString()}名</span>
                        </>
                      )}
                      {arrival.arrivalTime && (
                        <>
                          <span className="text-slate-400">入港</span>
                          <span className="text-slate-700 font-medium">{arrival.arrivalTime}</span>
                        </>
                      )}
                      {arrival.departureTime && (
                        <>
                          <span className="text-slate-400">出港</span>
                          <span className="text-slate-700 font-medium">{arrival.departureTime}</span>
                        </>
                      )}
                    </div>
                    {(arrival.previousPort || arrival.nextPort) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        {arrival.previousPort && <span>{arrival.previousPort}</span>}
                        <span className="text-slate-300">→</span>
                        <span className="font-medium text-slate-700">{arrival.terminal === "晴海客船ターミナル" ? "晴海" : "東京"}</span>
                        {arrival.nextPort && (
                          <>
                            <span className="text-slate-300">→</span>
                            <span>{arrival.nextPort}</span>
                          </>
                        )}
                      </div>
                    )}
                    {arrival.note && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        ⚠ {arrival.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">ターミナル凡例</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-sky-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">晴海客船ターミナル</p>
                <p className="text-xs text-slate-400">中・小型客船対応</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">東京国際クルーズターミナル</p>
                <p className="text-xs text-slate-400">大型客船対応（有明）</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
