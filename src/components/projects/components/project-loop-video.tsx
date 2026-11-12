"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";

type ProjectLoopVideoProps = {
  src: string;
  mimeType?: string | null;
  poster?: string;
  className?: string;
};

export default function ProjectLoopVideo({
  src,
  mimeType,
  poster,
  className,
}: ProjectLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const syncReducedMotion = (prefersReducedMotion: boolean) => {
      if (prefersReducedMotion) {
        video.removeAttribute("autoplay");
        video.pause();
      } else if (video.paused && video.readyState >= 2) {
        video.play().catch(() => {});
      }
    };

    syncReducedMotion(reducedMotionQuery.matches);
    const handleMotionChange = (event: MediaQueryListEvent) => {
      syncReducedMotion(event.matches);
    };
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    // IntersectionObserver fallback when native HTMLMediaElement.prototype.loading is unsupported
    const supportsLazyMedia = Object.hasOwn(
      HTMLMediaElement.prototype,
      "loading",
    );
    let observer: IntersectionObserver | null = null;

    if (!supportsLazyMedia) {
      if (video.hasAttribute("poster")) {
        video.dataset.poster = video.getAttribute("poster") || "";
        video.removeAttribute("poster");
      }
      video.dataset.preload = video.getAttribute("preload") || "metadata";
      video.preload = "none";

      observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const media = entry.target as HTMLVideoElement;

            if (media.dataset.poster) {
              media.poster = media.dataset.poster;
              delete media.dataset.poster;
            }
            if (media.dataset.preload) {
              media.preload = media.dataset.preload as
                | ""
                | "none"
                | "metadata"
                | "auto";
              delete media.dataset.preload;
            }
            media.load();
            if (!reducedMotionQuery.matches) {
              media.play().catch(() => {});
            }
            obs.unobserve(media);
          }
        },
        { rootMargin: "200px 0px" },
      );

      observer.observe(video);
    }

    return () => {
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
      observer?.disconnect();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      {...({ loading: "lazy" } as any)}
      aria-hidden="true"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      width={960}
      height={540}
      poster={poster}
      className={clsx(
        "aspect-video w-full object-cover",
        className,
      )}
    >
      <source src={src} type={mimeType || "video/mp4"} />
    </video>
  );
}
