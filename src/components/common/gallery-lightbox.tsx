"use client";

import { Media } from "@/payload-types";
import Image from "next/image";
import { useEffect, useState } from "react";
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-sm px-2 sm:px-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-1 sm:p-2 bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm rounded-full cursor-pointer"
        aria-label="Close"
      >
        <X className="sm:w-5 sm:h-5 w-4 h-4" />
      </button>
      <div className="flex items-center justify-center w-full max-w-7xl gap-2 sm:gap-4">
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="sm:w-5 sm:h-5 w-4 h-4" />
          </button>
        )}
        <div className="h-[75vh] w-full relative flex flex-col gap-1 items-center">
          <div
            className="relative w-full flex-1 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={image.url}
              alt={image.alt || ""}
              fill
              className="object-contain "
              sizes="100vw"
              priority
            />
          </div>

        </div>

        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="shrink-0 p-1 sm:p-2 rounded-full bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm cursor-pointer hover:bg-utils-scent-gray-01/80 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="sm:w-5 sm:h-5 w-4 h-4" />
          </button>
        )}
      </div>
      <div className="absolute w-full sm:bottom-4 bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-4">
        {currentItem.caption && (
          <div className=" text-center text-sm text-foreground">
            {currentItem.caption}
          </div>
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
      </div>
    </div>
  );
}
