"use client";

import { Blog, Media, Project } from "@/payload-types";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

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

  const scrollToCarouselIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const children = scrollContainerRef.current.children;
      if (children[index]) {
        children[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  const handleCarouselScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const children = scrollContainerRef.current.children;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const containerCenter = scrollLeft + clientWidth / 2;
      const distance = Math.abs(childCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    setActiveCarouselIndex(closestIndex);
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
              <div key={item.id || index} className="relative break-inside-avoid group gap-1 cursor-pointer" onClick={() => setActiveImageIndex(index)}>
                <ZoomIn size={16} className="absolute top-2 right-2 text-background z-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <small className="text-foreground block text-left italic">
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
        <div className="relative group/carousel w-full flex flex-col gap-2">
          <div
            ref={scrollContainerRef}
            onScroll={handleCarouselScroll}
            tabIndex={0}
            aria-label="Image Carousel"
            className="flex w-full overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-utils-scent-orange rounded-lg"
          >
            {images.map((item, index) => {
              const image = item.image as Media;
              const imageUrl = image.sizes?.tablet?.url || image.url;
              if (!imageUrl) return null;

              return (
                <div
                  key={item.id || index}
                  className="relative snap-center shrink-0 w-[85%] md:w-[60%] flex flex-col gap-1 group cursor-pointer"
                  onClick={() => setActiveImageIndex(index)}
                >
                  <ZoomIn size={16} className="absolute top-2 right-2 text-background z-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    <small className="italic text-foreground block">
                      {item.caption}
                    </small>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex w-full items-center justify-between gap-2">
            {images.length > 1 && (
              <div className="flex w-fit items-center justify-center gap-2 bg-background/40 backdrop-blur-md px-3 py-2 rounded-full border border-border-color">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToCarouselIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === activeCarouselIndex
                      ? "bg-foreground w-4"
                      : "bg-foreground/20 hover:bg-utils-scent-orange"
                      }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}<div className="flex items-center gap-2">
              {images.length > 1 && (
                <button
                  onClick={() => scroll("left")}
                  className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {images.length > 1 && (
                <button
                  onClick={() => scroll("right")}
                  className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={20} />
                </button>
              )}</div>
          </div>
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
            <div key={item.id || index} className="relative flex flex-col group gap-1 cursor-pointer" onClick={() => setActiveImageIndex(index)}>
              <ZoomIn size={16} className="absolute top-2 right-2 text-background z-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <small className="italic text-foreground block">
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
