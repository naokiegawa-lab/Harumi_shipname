"use client";

export default function TodayDate() {
  return (
    <p className="text-slate-500 text-sm">
      {new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })}{" "}
      現在
    </p>
  );
}
