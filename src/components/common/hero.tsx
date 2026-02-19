"use client";
import { Media } from "@/payload-types";
import { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  const [isError, setIsError] = useState(false);
  const heroUrl = image?.sizes?.tablet?.url || image?.url || "";
  const showImage = image && heroUrl && !isError;

  return (
    <div className="sm:border-border-color bg-foreground relative flex h-80 w-full max-w-3xl items-end overflow-hidden p-2.5 sm:rounded-lg sm:border sm:p-5 sm:shadow-sm">
      {goBack && (
        <Link
          href={"/notes"}
          className="text-background border-background hover:border-background absolute top-2 left-2 z-50 flex cursor-pointer items-center gap-1 border-b transition-all ease-in-out sm:border-transparent"
        >
          <ChevronLeft size={14} />
          <small>Back to Blogs</small>
        </Link>
      )}
      {showImage && (
        <Image
          src={heroUrl}
          alt={image.alt}
          fill
          className="object-cover object-center"
          placeholder={image?.blurData ? "blur" : "empty"}
          blurDataURL={image?.blurData || undefined}
          sizes="(max-width: 768px) 100vw, 800px"
          priority={true}
          onError={() => setIsError(true)}
        />
      )}
      <div className="from-foreground via-foreground/50 absolute top-0 left-0 h-full w-full bg-linear-to-t via-40% to-transparent"></div>
      <div className="relative">
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
