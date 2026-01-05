import { Media } from "@/payload-types";
import { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Hero({
  image,
  title,
  description,
  goBack = false,
}: {
  image: Media;
  title?: string;
  description?: string | SerializedEditorState;
  goBack?: boolean;
}) {
  const heroUrl = image?.sizes?.tablet?.url || image?.url || "";

  return (
    <div className="sm:border-border-color relative flex h-80 w-full max-w-3xl items-end overflow-hidden p-2.5 sm:rounded-lg sm:border sm:p-5 sm:shadow-sm">
      {goBack && (
        <Link
          href={"/notes"}
          className="text-background border-background hover:border-background absolute top-2 left-2 z-50 flex cursor-pointer items-center gap-1 border-b transition-all ease-in-out sm:border-transparent"
        >
          <ChevronLeft size={14} />
          <small>Back to Blogs</small>
        </Link>
      )}
      <Image
        src={heroUrl}
        alt={image.alt}
        fill
        className="object-cover object-center"
        placeholder={image?.blurData ? "blur" : "empty"}
        blurDataURL={image?.blurData!}
        sizes="(max-width: 768px) 100vw, 800px"
        priority={true}
      />
      <div className="relative rounded-lg border-2 border-white bg-[#ffffff67] p-2 shadow-sm">
        {title && <h1 className="text-2xl font-medium! text-white">{title}</h1>}
        {description &&
          (typeof description === "string" ? (
            <p className="max-w-lg text-white">{description}</p>
          ) : (
            <RichText
              data={description}
              className="max-w-lg text-sm text-white"
            />
          ))}
      </div>
    </div>
  );
}
