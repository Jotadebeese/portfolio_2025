"use client";

import { Media } from "@/payload-types";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type GalleryImage = {
  id?: string | null;
  image: string | number | Media;
  caption?: string | null;
};

export default function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [currentIndex, onClose]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) return null;

  const currentItem = images[currentIndex];
  if (!currentItem) return null;

  const image = currentItem.image as Media;

  if (!image.url) return null;

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isPinching = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      isPinching.current = true;
      return;
    }
    isPinching.current = false;
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinching.current) return;
    touchEndX.current = e.changedTouches[0].screenX;
    if (touchStartX.current - touchEndX.current > 50) nextImage();
    if (touchStartX.current - touchEndX.current < -50) prevImage();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-sm px-2 sm:px-4 focus:outline-none"
      onClick={onClose}
      onTouchStart={images.length > 1 ? handleTouchStart : undefined}
      onTouchEnd={images.length > 1 ? handleTouchEnd : undefined}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-1 sm:p-2 bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm rounded-full cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <div className="flex items-center justify-center w-full max-w-7xl gap-2 sm:gap-4">

        <div className="h-[75vh] w-full relative flex flex-col gap-1 items-center">
          <div
            className="relative w-full flex-1 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((item, index) => {
              const img = item.image as Media;
              if (!img.url) return null;

              const isCurrent = index === currentIndex;
              const isAdjacent =
                index === (currentIndex + 1) % images.length ||
                index === (currentIndex - 1 + images.length) % images.length;

              return (
                <Image
                  key={index}
                  src={img.url}
                  alt={img.alt || ""}
                  fill
                  className={`object-contain transition-opacity duration-300 ${isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  sizes="100vw"
                  priority={isCurrent || isAdjacent}
                />
              );
            })}
          </div>
        </div>


      </div>
      <div className="absolute px-2 sm:px-4 w-full z-50 sm:bottom-4 bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-4">
        {currentItem.caption && (
          <small className="block max-w-full truncate text-center text-sm text-foreground bg-background/40 backdrop-blur-md px-4 py-2 rounded-full border border-border-color">
            {currentItem.caption}
          </small>
        )}

        <div className="flex items-center justify-center gap-2">
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {images.length > 1 && (
            <div className="flex w-fit items-center justify-center gap-2 z-50 bg-background/40 backdrop-blur-md px-3 py-2 rounded-full border border-border-color">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === currentIndex
                    ? "bg-foreground w-4"
                    : "bg-foreground/20 hover:bg-utils-scent-orange"
                    }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          )}</div>
      </div>
    </div>
  );
}
