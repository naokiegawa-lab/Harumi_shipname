import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "晴海フェリーターミナル 接岸船舶情報",
  description:
    "晴海フェリーターミナルに接岸している船舶の詳細情報・運航スケジュールを確認できます。",
  openGraph: {
    title: "晴海フェリーターミナル 接岸船舶情報",
    description: "晴海フェリーターミナルに接岸している船舶の情報をリアルタイムで表示。",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
