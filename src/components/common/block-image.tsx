"use client";

import Image from "next/image";
import { useState } from "react";
import GalleryLightbox from "./gallery-lightbox";
import { Media } from "@/payload-types";
import { ZoomIn } from "lucide-react";

export default function BlockImage({
  image,
  caption,
}: {
  image: Media;
  caption?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const imageUrl = image.sizes?.tablet?.url || image.url;

  if (!imageUrl) return null;

  return (
    <>
      <div 
        className="relative group cursor-zoom-in flex flex-col gap-1 w-full" 
        onClick={() => setIsOpen(true)}
      >
        <ZoomIn size={24} className="p-1 rounded-full bg-foreground/20 backdrop-blur-md absolute top-2 right-2 text-background z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-full rounded-lg overflow-hidden shadow-sm bg-foreground/5">
          <Image
            src={imageUrl}
            alt={image.alt || ""}
            width={image.width || 800}
            height={image.height || 600}
            className="w-full h-auto"
            placeholder={image.blurData ? "blur" : "empty"}
            blurDataURL={image.blurData || undefined}
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
        {caption && (
          <small className="text-foreground block italic text-left px-1 mt-1">{caption}</small>
        )}
      </div>

      {isOpen && (
        <GalleryLightbox
          images={[{ image, caption }]}
          initialIndex={0}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
