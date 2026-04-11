"use client";

import { Blog, Media, Project } from "@/payload-types";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GalleryLightbox from "./gallery-lightbox";

type GalleryBlock = Extract<
  (Blog["content"] | Project["content"])[number],
  { blockType: "gallery" }
>;

export default function BlockGallery({
  layout = "grid",
  images,
}: {
  layout: GalleryBlock["layout"];
  images: GalleryBlock["images"];
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth * 0.7
          : scrollLeft + clientWidth * 0.7;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const renderLayout = () => {
    if (layout === "masonry") {
      return (
        <div className="columns-2 md:columns-3 gap-4 space-y-4 w-full">
          {images.map((item, index) => {
            const image = item.image as Media;
            const imageUrl = image.sizes?.tablet?.url || image.url;
            if (!imageUrl) return null;

            return (
              <div key={item.id || index} className="break-inside-avoid mb-4 group cursor-zoom-in" onClick={() => setActiveImageIndex(index)}>
                <div className="relative rounded-lg overflow-hidden flex flex-col">
                  <Image
                    src={imageUrl}
                    alt={image.alt || ""}
                    width={image.width || 800}
                    height={image.height || 600}
                    className="w-full h-auto object-cover bg-foreground/5 transition-transform duration-300 group-hover:scale-105"
                    placeholder={image.blurData ? "blur" : "empty"}
                    blurDataURL={image.blurData || undefined}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                {item.caption && (
                  <small className="italic text-foreground/70 block mt-2 text-center text-sm">
                    {item.caption}
                  </small>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (layout === "carousel") {
      return (
        <div className="relative group/carousel w-full">
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 p-2 rounded-full shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden md:block hover:bg-background"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex w-full overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar"
          >
            {images.map((item, index) => {
              const image = item.image as Media;
              const imageUrl = image.sizes?.tablet?.url || image.url;
              if (!imageUrl) return null;

              return (
                <div
                  key={item.id || index}
                  className="snap-center shrink-0 w-[85%] md:w-[60%] flex flex-col group cursor-zoom-in"
                  onClick={() => setActiveImageIndex(index)}
                >
                  <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden bg-foreground/5">
                    <Image
                      src={imageUrl}
                      alt={image.alt || ""}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      placeholder={image.blurData ? "blur" : "empty"}
                      blurDataURL={image.blurData || undefined}
                      sizes="(max-width: 768px) 85vw, 60vw"
                    />
                  </div>
                  {item.caption && (
                    <small className="italic text-foreground/70 block mt-2 text-center text-sm">
                      {item.caption}
                    </small>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 p-2 rounded-full shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden md:block hover:bg-background"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {images.map((item, index) => {
          const image = item.image as Media;
          const imageUrl = image.sizes?.tablet?.url || image.url;
          if (!imageUrl) return null;

          return (
            <div key={item.id || index} className="flex flex-col group cursor-zoom-in" onClick={() => setActiveImageIndex(index)}>
              <div className="relative aspect-square sm:aspect-video w-full rounded-lg overflow-hidden bg-foreground/5">
                <Image
                  src={imageUrl}
                  alt={image.alt || ""}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  placeholder={image.blurData ? "blur" : "empty"}
                  blurDataURL={image.blurData || undefined}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              {item.caption && (
                <small className="italic text-foreground/70 block mt-2 text-center text-sm">
                  {item.caption}
                </small>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {renderLayout()}

      {activeImageIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={activeImageIndex}
          onClose={() => setActiveImageIndex(null)}
        />
      )}
    </>
  );
}
