/**
 * 船名から運航会社・総トン数・旅客定員・就航年・英語名・国旗を補完するデータベース
 *
 * データは data/shipDatabase.json に格納。
 * scripts/enrich-ships.mjs が未知の船を自動検索して JSON を更新する。
 */
import dbJson from "./shipDatabase.json";

/** Wikimedia Commons の外観写真（scripts/fetch-ship-images.mjs が登録） */
export type ShipImage = {
  /** サムネイル画像 URL */
  url: string;
  /** Commons のファイルページ（出典） */
  pageUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
};

export type ShipInfo = {
  nameEn: string;
  operator: string;
  grossTonnage: string;
  passengers: number;
  builtYear: number;
  flag: string;
  length?: string;
  image?: ShipImage;
};

const DB: Record<string, ShipInfo> = dbJson as Record<string, ShipInfo>;

/** 船名からデータベース情報を検索 */
export function lookupShip(shipName: string): ShipInfo | undefined {
  return DB[shipName];
}
