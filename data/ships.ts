export type Ship = {
  id: string;
  name: string;
  nameEn: string;
  operator: string;
  type: string;
  flag: string;
  grossTonnage: string;
  length: string;
  width: string;
  builtYear: number;
  capacity: {
    passengers: number;
    vehicles?: number;
    cargo?: string;
  };
  route: string;
  status: "接岸中" | "出港準備中" | "停泊中";
  berthNumber: string;
  image: string;
  description: string;
  schedules: Schedule[];
  facilities: string[];
};

export type Schedule = {
  id: string;
  departure: string;
  arrival: string;
  departurePort: string;
  arrivalPort: string;
  departureTime: string;
  arrivalTime: string;
  status: "定刻" | "遅延" | "欠航" | "到着済" | "出港準備中";
  delay?: string;
  note?: string;
};

export const ships: Ship[] = [
  {
    id: "silver-moon",
    name: "シルバー・ムーン",
    nameEn: "Silver Moon",
    operator: "シルバーシー・クルーズ",
    type: "クルーズ客船",
    flag: "🇧🇸",
    grossTonnage: "40,700 GT",
    length: "213.0 m",
    width: "27.0 m",
    builtYear: 2020,
    capacity: {
      passengers: 596,
    },
    route: "アジア周遊クルーズ 2026",
    status: "接岸中",
    berthNumber: "晴海客船ターミナル",
    image: "/ships/silver-moon.jpg",
    description:
      "シルバーシー・クルーズが運航する超高級クルーズ客船。2020年就航の最新鋭船で、全室スイート・オールインクルーシブを特徴とする。乗客596名に対しクルー411名という手厚いサービス体制で知られ、世界最高水準のラグジュアリーシーが体験できる。本日は東京・晴海客船ターミナルに寄港中で、入港時間変更のアナウンスが出ている。",
    schedules: [
      {
        id: "sm1",
        departure: "2026-04-06",
        arrival: "2026-04-06",
        departurePort: "神戸",
        arrivalPort: "東京（晴海）",
        departureTime: "—",
        arrivalTime: "変更あり",
        status: "到着済",
        note: "本日入港（入港時間変更あり）",
      },
      {
        id: "sm2",
        departure: "2026-04-06",
        arrival: "2026-04-07",
        departurePort: "東京（晴海）",
        arrivalPort: "次寄港地",
        departureTime: "19:00",
        arrivalTime: "—",
        status: "定刻",
        note: "本日出港予定",
      },
      {
        id: "sm3",
        departure: "2026-04-30",
        arrival: "2026-04-30",
        departurePort: "—",
        arrivalPort: "東京（晴海）",
        departureTime: "08:00",
        arrivalTime: "08:00",
        status: "定刻",
        note: "4月30日 再入港予定",
      },
    ],
    facilities: [
      "全室スイートキャビン",
      "オールインクルーシブ",
      "複数レストラン",
      "プール・ジャグジー",
      "スパ・フィットネスセンター",
      "カジノ",
      "バー・ラウンジ",
      "Wi-Fi",
      "コンシェルジュサービス",
    ],
  },
  {
    id: "mitsui-ocean-fuji",
    name: "三井オーシャンフジ",
    nameEn: "MITSUI OCEAN FUJI",
    operator: "三井オーシャンクルーズ",
    type: "クルーズ客船",
    flag: "🇯🇵",
    grossTonnage: "32,477 GT",
    length: "198.2 m",
    width: "25.6 m",
    builtYear: 2009,
    capacity: {
      passengers: 458,
    },
    route: "日本発着クルーズ 2026",
    status: "停泊中",
    berthNumber: "東京国際クルーズターミナル",
    image: "/ships/mitsui-ocean-fuji.jpg",
    description:
      "三井オーシャンクルーズが運航する日本発着の高級クルーズ客船。2009年建造（元シーボーン・オデッセイ）を商船三井グループが購入し、2024年12月に「三井オーシャンフジ」として就航。客室229室・旅客定員458名の中型船で、きめ細やかなサービスと和のおもてなしが特徴。晴海客船ターミナルへの入港で話題を集めた。",
    schedules: [
      {
        id: "mof1",
        departure: "2026-04-06",
        arrival: "2026-04-06",
        departurePort: "横浜",
        arrivalPort: "東京（晴海）",
        departureTime: "—",
        arrivalTime: "入港済",
        status: "到着済",
        note: "本日晴海入港",
      },
      {
        id: "mof2",
        departure: "2026-04-07",
        arrival: "2026-04-07",
        departurePort: "東京（晴海）",
        arrivalPort: "次寄港地",
        departureTime: "17:00",
        arrivalTime: "—",
        status: "定刻",
        note: "明日出港予定",
      },
    ],
    facilities: [
      "メインダイニング",
      "スペシャリティレストラン",
      "プール・デッキ",
      "スパ・フィットネス",
      "ショー・エンターテイメント",
      "バー・ラウンジ",
      "ショッピング",
      "Wi-Fi",
      "和のおもてなしサービス",
    ],
  },
];

export function getShipById(id: string): Ship | undefined {
  return ships.find((s) => s.id === id);
}
