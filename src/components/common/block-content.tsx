import { Blog, Media } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import Image from "next/image";

export default function BlockContent({ data }: { data: Blog["content"] }) {
  return (
    <div className="px-2.5 sm:px-0">
      <div className="border-border-color mt-5 flex w-full items-center justify-center border-y border-dashed py-8">
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
