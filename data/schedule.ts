export type PortArrival = {
  id: string;
  shipName: string;
  shipNameEn: string;
  operator: string;
  terminal: "晴海客船ターミナル" | "東京国際クルーズターミナル";
  arrivalDate: string;   // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  arrivalTime?: string;
  departureTime?: string;
  grossTonnage: string;
  passengers: number;
  length: string;
  builtYear: number;
  flag: string;
  type: "クルーズ客船" | "探検船";
  previousPort?: string;
  nextPort?: string;
  note?: string;
};

export const april2026Schedule: PortArrival[] = [
  {
    id: "heritage-adventurer-0401",
    shipName: "ヘリテージ・アドベンチャラー",
    shipNameEn: "Heritage Adventurer",
    operator: "ヘリテージ・エクスペディションズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-01",
    departureDate: "2026-04-01",
    departureTime: "出港時間変更あり",
    grossTonnage: "5,750 GT",
    passengers: 140,
    length: "113.0 m",
    builtYear: 1991,
    flag: "🇳🇿",
    type: "探検船",
    note: "出港時間変更のアナウンスあり",
  },
  {
    id: "msc-bellissima-0401",
    shipName: "MSCベリッシマ",
    shipNameEn: "MSC Bellissima",
    operator: "MSCクルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-01",
    departureDate: "2026-04-02",
    grossTonnage: "171,598 GT",
    passengers: 4500,
    length: "316.0 m",
    builtYear: 2019,
    flag: "🇵🇦",
    type: "クルーズ客船",
  },
  {
    id: "regatta-0403",
    shipName: "レガッタ",
    shipNameEn: "Regatta",
    operator: "オーシャニア・クルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-03",
    departureDate: "2026-04-03",
    grossTonnage: "30,277 GT",
    passengers: 684,
    length: "181.0 m",
    builtYear: 1998,
    flag: "🇲🇭",
    type: "クルーズ客船",
  },
  {
    id: "crystal-symphony-0405",
    shipName: "クリスタル・シンフォニー",
    shipNameEn: "Crystal Symphony",
    operator: "クリスタル・クルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-05",
    departureDate: "2026-04-05",
    grossTonnage: "51,044 GT",
    passengers: 848,
    length: "238.0 m",
    builtYear: 1995,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "silver-moon-0406",
    shipName: "シルバー・ムーン",
    shipNameEn: "Silver Moon",
    operator: "シルバーシー・クルーズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-06",
    departureDate: "2026-04-06",
    arrivalTime: "変更あり",
    departureTime: "19:00",
    grossTonnage: "40,700 GT",
    passengers: 596,
    length: "213.0 m",
    builtYear: 2020,
    flag: "🇧🇸",
    type: "クルーズ客船",
    note: "入港時間変更あり（本日停泊中）",
  },
  {
    id: "mitsui-ocean-fuji-0406",
    shipName: "三井オーシャンフジ",
    shipNameEn: "MITSUI OCEAN FUJI",
    operator: "三井オーシャンクルーズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-06",
    departureDate: "2026-04-07",
    arrivalTime: "入港済",
    departureTime: "17:00",
    grossTonnage: "32,477 GT",
    passengers: 458,
    length: "198.2 m",
    builtYear: 2009,
    flag: "🇯🇵",
    type: "クルーズ客船",
    note: "本日停泊中",
  },
  {
    id: "seven-seas-explorer-0408",
    shipName: "セブンシーズ・エクスプローラー",
    shipNameEn: "Seven Seas Explorer",
    operator: "リージェント・セブンシーズ・クルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-08",
    departureDate: "2026-04-08",
    grossTonnage: "56,000 GT",
    passengers: 750,
    length: "224.0 m",
    builtYear: 2016,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "silver-nova-0409",
    shipName: "シルバー・ノバ",
    shipNameEn: "Silver Nova",
    operator: "シルバーシー・クルーズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-09",
    departureDate: "2026-04-09",
    grossTonnage: "54,700 GT",
    passengers: 728,
    length: "244.0 m",
    builtYear: 2023,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "msc-bellissima-0411",
    shipName: "MSCベリッシマ",
    shipNameEn: "MSC Bellissima",
    operator: "MSCクルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-11",
    departureDate: "2026-04-11",
    grossTonnage: "171,598 GT",
    passengers: 4500,
    length: "316.0 m",
    builtYear: 2019,
    flag: "🇵🇦",
    type: "クルーズ客船",
  },
  {
    id: "seven-seas-explorer-0419",
    shipName: "セブンシーズ・エクスプローラー",
    shipNameEn: "Seven Seas Explorer",
    operator: "リージェント・セブンシーズ・クルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-19",
    departureDate: "2026-04-19",
    grossTonnage: "56,000 GT",
    passengers: 750,
    length: "224.0 m",
    builtYear: 2016,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "msc-bellissima-0420",
    shipName: "MSCベリッシマ",
    shipNameEn: "MSC Bellissima",
    operator: "MSCクルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-20",
    departureDate: "2026-04-21",
    grossTonnage: "171,598 GT",
    passengers: 4500,
    length: "316.0 m",
    builtYear: 2019,
    flag: "🇵🇦",
    type: "クルーズ客船",
  },
  {
    id: "silver-nova-0423",
    shipName: "シルバー・ノバ",
    shipNameEn: "Silver Nova",
    operator: "シルバーシー・クルーズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-23",
    departureDate: "2026-04-23",
    grossTonnage: "54,700 GT",
    passengers: 728,
    length: "244.0 m",
    builtYear: 2023,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "seven-seas-explorer-0425",
    shipName: "セブンシーズ・エクスプローラー",
    shipNameEn: "Seven Seas Explorer",
    operator: "リージェント・セブンシーズ・クルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-25",
    departureDate: "2026-04-26",
    grossTonnage: "56,000 GT",
    passengers: 750,
    length: "224.0 m",
    builtYear: 2016,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
  {
    id: "msc-bellissima-0429",
    shipName: "MSCベリッシマ",
    shipNameEn: "MSC Bellissima",
    operator: "MSCクルーズ",
    terminal: "東京国際クルーズターミナル",
    arrivalDate: "2026-04-29",
    departureDate: "2026-04-30",
    grossTonnage: "171,598 GT",
    passengers: 4500,
    length: "316.0 m",
    builtYear: 2019,
    flag: "🇵🇦",
    type: "クルーズ客船",
  },
  {
    id: "silver-moon-0430",
    shipName: "シルバー・ムーン",
    shipNameEn: "Silver Moon",
    operator: "シルバーシー・クルーズ",
    terminal: "晴海客船ターミナル",
    arrivalDate: "2026-04-30",
    departureDate: "2026-04-30",
    arrivalTime: "08:00",
    departureTime: "19:00",
    grossTonnage: "40,700 GT",
    passengers: 596,
    length: "213.0 m",
    builtYear: 2020,
    flag: "🇧🇸",
    type: "クルーズ客船",
  },
];

/** 指定日に停泊中の船を返す（arrivalDate <= date <= departureDate） */
export function getArrivalsForDate(dateStr: string): PortArrival[] {
  return april2026Schedule.filter(
    (a) => a.arrivalDate <= dateStr && a.departureDate >= dateStr
  );
}

/** 指定月（YYYY-MM）の全入港をまとめる */
export function getArrivalsByMonth(yearMonth: string): Record<string, PortArrival[]> {
  const result: Record<string, PortArrival[]> = {};
  for (const arrival of april2026Schedule) {
    if (arrival.arrivalDate.startsWith(yearMonth)) {
      if (!result[arrival.arrivalDate]) result[arrival.arrivalDate] = [];
      result[arrival.arrivalDate].push(arrival);
    }
  }
  return result;
}
