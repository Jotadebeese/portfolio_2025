import { Blog, Media } from "@/payload-types";
import clsx from "clsx";
import Image from "next/image";
import { RichText } from "../RichText";

export default function BlockContent({
  data,
  className,
}: {
  data: Blog["content"];
  className?: string;
}) {
  if (!data) return null;

  return (
    <div className="prose prose-lg relative w-full max-w-3xl px-2.5 sm:px-0">
      <div
        className={clsx(
          "border-border-color mt-5 flex flex-col items-center justify-center border-y border-dashed pt-5 pb-8",
          className,
        )}
      >
        <div className="flex w-full max-w-3xl flex-col gap-5">
          {data.map((block, index) => {
            if (block.blockType === "text") {
              return (
                <div key={index} className="w-full">
                  <RichText data={block.text} className="RichText w-full" />
                </div>
              );
            }
            if (block.blockType === "image") {
              const image = block.image as Media;
              const imageUrl = image.sizes?.tablet?.url || image.url;

              if (!imageUrl) return null;

              return (
                <div className="flex flex-col" key={index}>
                  <div className="relative h-80 overflow-hidden rounded-lg shadow-sm">
                    <Image
                      src={imageUrl}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      placeholder={image.blurData ? "blur" : "empty"}
                      blurDataURL={image.blurData || undefined}
                      sizes="(max-width: 768px) 100vw, 768px"
                    />
                  </div>
                  {block.caption && (
                    <small className="italic">{block.caption}</small>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
