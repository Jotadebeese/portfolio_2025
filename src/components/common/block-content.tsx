import { Blog, Media } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import clsx from "clsx";
import Image from "next/image";

export default function BlockContent({ data }: { data: Blog["content"] }) {
  if (!data) return null;

  return (
    <div className="relative px-2.5 sm:px-0">
      <div
        className={clsx(
          "border-border-color mt-5 flex w-full flex-col items-center justify-center border-y border-dashed pt-8 pb-8",
        )}
      >
        <div className="flex max-w-3xl flex-col gap-5">
          {data.map((block, index) => {
            if (block.blockType === "text") {
              return (
                <div key={index}>
                  <RichText data={block.text} className="RichText" />
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
