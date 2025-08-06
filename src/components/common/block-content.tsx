import { Blog, Media } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import clsx from "clsx";
import Image from "next/image";

export default function BlockContent({ data }: { data: Blog["content"] }) {
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
              return (
                image.url && (
                  <div className="flex flex-col" key={index}>
                    <div className="relative h-80 overflow-hidden rounded-lg shadow-sm">
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={image?.blurData}
                      />
                    </div>
                    {block.caption && (
                      <small className="italic">{block.caption}</small>
                    )}
                  </div>
                )
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
