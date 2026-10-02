import Image from "next/image";
import type { ShipImage } from "@/data/shipDatabase";

/** 16:9 の船の外観写真（Wikimedia Commons） */
export function ShipPhotoImage({
  image,
  alt,
  sizes,
  aspectClassName = "aspect-[16/9]",
  className = "",
}: {
  image: ShipImage;
  alt: string;
  sizes: string;
  aspectClassName?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${aspectClassName} ${className}`}>
      <Image src={image.url} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

/** 写真のクレジット（CC ライセンスの表示義務のため撮影者・ライセンスを必ず出す） */
export function PhotoCredit({ image, className = "" }: { image: ShipImage; className?: string }) {
  return (
    <p className={`text-[10px] leading-tight truncate ${className}`}>
      写真:{" "}
      <a href={image.pageUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
        {image.author}
      </a>
      {" / "}
      {image.licenseUrl ? (
        <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
          {image.license}
        </a>
      ) : (
        image.license
      )}
      {" / Wikimedia Commons"}
    </p>
  );
}

/** 写真 + 右下にクレジットを重ねる（詳細ページのヒーロー用） */
export function ShipPhotoWithOverlayCredit({
  image,
  alt,
  sizes,
  aspectClassName,
}: {
  image: ShipImage;
  alt: string;
  sizes: string;
  aspectClassName?: string;
}) {
  return (
    <figure className="relative">
      <ShipPhotoImage image={image} alt={alt} sizes={sizes} aspectClassName={aspectClassName} />
      <figcaption className="absolute bottom-0 right-0 max-w-full">
        <PhotoCredit image={image} className="rounded-tl-md bg-black/50 px-2 py-0.5 text-white/90" />
      </figcaption>
    </figure>
  );
}

/** 写真 + 下にクレジット */
export default function ShipPhoto({ image, alt, sizes }: { image: ShipImage; alt: string; sizes: string }) {
  return (
    <figure className="mb-3">
      <ShipPhotoImage image={image} alt={alt} sizes={sizes} className="rounded-xl" />
      <figcaption>
        <PhotoCredit image={image} className="mt-1 text-slate-400" />
      </figcaption>
    </figure>
  );
}
