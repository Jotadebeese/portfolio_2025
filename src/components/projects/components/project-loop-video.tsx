"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

type ProjectLoopVideoProps = {
  src?: string | null;
  mimeType?: string | null;
  webmSrc?: string | null;
  webmMimeType?: string | null;
  poster?: string | null;
  className?: string;
};

/**
 * Lazily attaches video sources (WebM first, MP4 fallback) and begins muted
 * playback only when approaching the viewport, preventing eager SSR fetches
 * across all browsers while reserving aspect-ratio layout space.
 */
export default function ProjectLoopVideo({
  src,
  mimeType,
  webmSrc,
  webmMimeType,
  poster,
  className,
}: ProjectLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isIntersectingRef = useRef(false);
  const shouldLoadRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersectingRef.current = entry.isIntersecting;

          if (entry.isIntersecting) {
            if (!shouldLoadRef.current) {
              shouldLoadRef.current = true;
              setShouldLoad(true);
            } else if (!reducedMotionQuery.matches && video.paused) {
              video.play().catch(() => {});
            }
          } else if (!video.paused) {
            video.pause();
          }
        }
      },
      { rootMargin: "150px 0px" },
    );

    observer.observe(video);

    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        video.pause();
      } else if (
        shouldLoadRef.current &&
        isIntersectingRef.current &&
        video.paused
      ) {
        video.play().catch(() => {});
      }
    };

    reducedMotionQuery.addEventListener("change", handleMotionChange);

    return () => {
      observer.disconnect();
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [src, webmSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    video.preload = reducedMotionQuery.matches ? "metadata" : "auto";
    video.load();
    if (!reducedMotionQuery.matches && isIntersectingRef.current) {
      video.play().catch(() => {});
    }
  }, [shouldLoad, src, webmSrc]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      loop
      muted
      playsInline
      preload="none"
      width={960}
      height={540}
      poster={shouldLoad && poster ? poster : undefined}
      onCanPlay={() => {
        const video = videoRef.current;
        if (
          video &&
          isIntersectingRef.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
          video.paused
        ) {
          video.play().catch(() => {});
        }
      }}
      className={clsx("aspect-video w-full object-cover", className)}
    >
      {shouldLoad && webmSrc && (
        <source src={webmSrc} type={webmMimeType || "video/webm"} />
      )}
      {shouldLoad && src && (
        <source src={src} type={mimeType || "video/mp4"} />
      )}
    </video>
  );
}
