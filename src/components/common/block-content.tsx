import { Blog, Media, Project } from "@/payload-types";
import clsx from "clsx";
import Image from "next/image";
import { RichText } from "../RichText";
import { codeToHtml } from "shiki";
import InteractiveCode from "./interactive-code";
import BlockGallery from "./block-gallery";
import BlockImage from "./block-image";

export default function BlockContent({
  data,
  className,
}: {
  data: Blog["content"] | Project["content"];
  className?: string;
}) {
  if (!data) return null;

  return (
    <div className="relative w-full max-w-3xl px-2.5 sm:px-0">
      <div
        className={clsx(
          "border-border-color mt-5 flex flex-col items-center justify-center border-t border-dashed pt-5 pb-20",
          className,
        )}
      >
        <div className="flex w-full max-w-3xl flex-col gap-5">
          {data.map((block, index) => {
            if (block.blockType === "text") {
              return (
                <div key={index} className="w-full">
                  <RichText
                    data={block.text}
                    className={clsx(
                      "prose prose-base text-foreground w-full max-w-none",
                      "prose-a:text-code-rust prose-a:no-underline hover:prose-a:underline",
                      "prose-blockquote:text-sm prose-blockquote:text-foreground prose-blockquote:font-normal prose-blockquote:border-l-utils-scent-gray-01 prose-blockquote:bg-white prose-blockquote:rounded-r-lg prose-blockquote:px-5 prose-blockquote:py-2",
                      "prose-code:text-code-rust prose-code:text-sm prose-code:bg-code-light-gray prose-code:rounded-md prose-code:px-1.5 prose-code:py-1.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-code:border-code-silver prose-code:border",
                      "prose-pre:bg-foreground prose-pre:text-sm! prose-pre:text-background prose-pre:rounded-xl prose-pre:border prose-pre:border-foreground/50",
                      "prose-li:marker:text-foreground/70",
                    )}
                  />
                </div>
              );
            }
            if (block.blockType === "image") {
              const image = block.image as Media;
              return (
                <div key={index} className="w-full">
                  <BlockImage image={image} caption={block.caption} />
                </div>
              );
            }
            if (block.blockType === "code-block") {
              return (
                <ShikiCode
                  key={index}
                  code={block.code}
                  language={block.language || "typescript"}
                />
              );
            }
            if (block.blockType === "gallery") {
              return (
                <div key={index} className="w-full my-4">
                  <BlockGallery
                    layout={block.layout}
                    images={block.images}
                  />
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

async function ShikiCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const html = await codeToHtml(code, {
    lang: language,
    themes: {
      light: "vitesse-light",
      dark: "vitesse-dark",
    },
  });

  return <InteractiveCode html={html} language={language} rawCode={code} />;
}
