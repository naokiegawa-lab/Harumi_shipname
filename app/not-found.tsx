import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <span className="text-6xl mb-6">⚓</span>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        ページが見つかりません
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="bg-sky-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-sky-700 transition-colors"
      >
        船舶一覧に戻る
      </Link>
    </div>
  );
}
