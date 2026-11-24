"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LIVE_TOOLS, ToolId } from "@/components/tools/types";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DRAG_THRESHOLD_PX = 4;
const KNOB_HALF = 18; // w-9 (36px) / 2

const SHORT_LABELS: Record<ToolId, string> = {
  "secret-generator": "Keys",
  "jwt-inspector": "JWT",
  "image-optimizer": "Image",
  "video-optimizer": "Video",
};

const NAV_ITEMS = [
  {
    id: "workbench",
    href: "/",
    label: "Workbench",
  },
  ...LIVE_TOOLS.map((tool) => ({
    id: tool.id,
    href: `/${tool.id}`,
    label: SHORT_LABELS[tool.id] ?? tool.shortName,
  })),
];

type Detent = {
  id: string;
  href: string;
  center: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  innerLeft: number;
  onKnob: boolean;
  startCenter: number;
  detents: Detent[];
  moved: boolean;
  target: Detent;
  lastPrefetchedId: string | null;
};

function getNearestDetent(detents: Detent[], x: number): Detent {
  let nearest = detents[0];
  let bestDist = Math.abs(x - nearest.center);

  for (let i = 1; i < detents.length; i++) {
    const dist = Math.abs(x - detents[i].center);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = detents[i];
    }
  }

  return nearest;
}

function rubberBand(val: number, min: number, max: number): number {
  if (val < min) return min - Math.min(4, (min - val) * 0.18);
  if (val > max) return max + Math.min(4, (val - max) * 0.18);
  return val;
}

export default function ForthwebHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const labelsRef = useRef<HTMLUListElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const hasMeasuredRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const activeItem = NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/" || pathname === "/forthweb"
      : pathname === item.href || pathname === `/forthweb${item.href}`,
  );
  const activeId = activeItem?.id ?? null;

  const [isDragging, setIsDragging] = useState(false);
  const [dragHoverId, setDragHoverId] = useState<string | null>(null);
  const [notches, setNotches] = useState<number[]>([]);
  const [knob, setKnob] = useState<{
    centerX: number;
    visible: boolean;
    animate: boolean;
  }>({ centerX: 0, visible: false, animate: false });

  const measureDetents = (railBorder: number): Detent[] => {
    const detents: Detent[] = [];
    for (const item of NAV_ITEMS) {
      const el = itemRefs.current[item.id];
      if (!el) continue;
      detents.push({
        id: item.id,
        href: item.href,
        center: el.offsetLeft + el.offsetWidth / 2 - railBorder,
      });
    }
    return detents;
  };

  useIsomorphicLayoutEffect(() => {
    const labelsEl = labelsRef.current;
    const railEl = railRef.current;
    if (!labelsEl || !railEl) return;

    const sync = (shouldAnimate: boolean) => {
      if (dragRef.current?.moved) return;
      const detents = measureDetents(railEl.clientLeft || 0);
      setNotches(detents.map((d) => d.center));

      const activeDetent = activeId
        ? detents.find((d) => d.id === activeId)
        : undefined;

      if (!activeDetent) {
        setKnob((prev) =>
          prev.visible ? { ...prev, visible: false } : prev,
        );
        return;
      }

      setKnob({
        centerX: activeDetent.center,
        visible: true,
        animate: shouldAnimate,
      });
    };

    sync(hasMeasuredRef.current);
    hasMeasuredRef.current = true;

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => sync(false));
    observer.observe(labelsEl);

    return () => observer.disconnect();
  }, [activeId]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const railEl = railRef.current;
    if (!railEl) return;

    const railBorder = railEl.clientLeft || 0;
    const detents = measureDetents(railBorder);
    if (detents.length === 0) return;

    const rect = railEl.getBoundingClientRect();
    const innerLeft = rect.left + railBorder;
    const localX = e.clientX - innerLeft;
    const activeDetent = activeId
      ? detents.find((d) => d.id === activeId)
      : undefined;

    const onKnob = Boolean(
      activeDetent && Math.abs(localX - activeDetent.center) <= KNOB_HALF + 8,
    );
    const initialTarget = activeDetent ?? getNearestDetent(detents, localX);

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      innerLeft,
      onKnob,
      startCenter: activeDetent ? activeDetent.center : localX,
      detents,
      moved: false,
      target: initialTarget,
      lastPrefetchedId: initialTarget.id,
    };

    try {
      railEl.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is rejected
    }

    if (onKnob) {
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
    }

    const rawCenter = drag.onKnob
      ? drag.startCenter + dx
      : e.clientX - drag.innerLeft;

    const minCenter = drag.detents[0].center;
    const maxCenter = drag.detents[drag.detents.length - 1].center;
    const clamped = rubberBand(rawCenter, minCenter, maxCenter);
    const hovered = getNearestDetent(drag.detents, clamped);

    drag.target = hovered;
    setDragHoverId((prev) => (prev === hovered.id ? prev : hovered.id));
    setKnob({
      centerX: clamped,
      visible: true,
      animate: false,
    });

    if (hovered.id !== drag.lastPrefetchedId) {
      router.prefetch(hovered.href);
      drag.lastPrefetchedId = hovered.id;
    }
  };

  const finishDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const drag = dragRef.current;
    const railEl = railRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;

    if (railEl) {
      try {
        if (railEl.hasPointerCapture(e.pointerId)) {
          railEl.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }

    setIsDragging(false);
    setDragHoverId(null);

    const activeDetent = activeId
      ? drag.detents.find((d) => d.id === activeId)
      : undefined;

    let snapTarget: Detent | undefined;
    if (cancelled) {
      snapTarget = activeDetent;
    } else if (!drag.moved) {
      const localX = e.clientX - drag.innerLeft;
      snapTarget = getNearestDetent(drag.detents, localX);
    } else {
      snapTarget = drag.target;
    }

    if (snapTarget) {
      setKnob({
        centerX: snapTarget.center,
        visible: true,
        animate: true,
      });

      if (!cancelled && snapTarget.id !== activeId) {
        router.push(snapTarget.href);
      }
    } else {
      setKnob((prev) => ({ ...prev, visible: false, animate: true }));
    }
  };

  const highlightedId = dragHoverId ?? activeId;

  return (
    <header className="pointer-events-none sticky top-0 z-30 flex w-full justify-center">
      <div className="flex w-full max-w-6xl items-center justify-between gap-3 px-2.5 py-2.5 sm:gap-4 sm:px-5">
        <Link
          href="/"
          aria-label="forthweb home"
          className="focus-visible:outline-foreground pointer-events-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full px-1.5 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span
            aria-hidden="true"
            className="bg-utils-scent-orange h-1.5 w-1.5 rounded-full"
          />
          <span className="font-roboto text-foreground text-sm font-medium tracking-tight">
            forthweb
          </span>
        </Link>

        <nav
          aria-label="forthweb navigation"
          className="pointer-events-auto max-w-full min-w-0"
        >
          <div className="no-scrollbar max-w-full overflow-x-auto pb-1.5 select-none">
            <div className="inline-flex flex-col">
              <ul
                ref={labelsRef}
                className="relative grid auto-cols-fr grid-flow-col items-center"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === activeId;
                  const isHighlighted = item.id === highlightedId;

                  return (
                    <li key={item.id} className="min-w-0">
                      <Link
                        ref={(el) => {
                          itemRefs.current[item.id] = el;
                        }}
                        href={item.href}
                        draggable={false}
                        aria-current={isActive ? "page" : undefined}
                        className={clsx(
                          "focus-visible:outline-foreground flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
                          isHighlighted
                            ? "text-foreground"
                            : "text-foreground/55 hover:text-foreground",
                        )}
                      >
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div
                ref={railRef}
                aria-hidden="true"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => finishDrag(e, false)}
                onPointerCancel={(e) => finishDrag(e, true)}
                className={clsx(
                  "border-border-color relative mt-1.5 h-2.5 w-full touch-pan-y rounded-full border bg-[#e2dfda]/95 shadow-[inset_0_1px_2px_rgba(24,20,17,0.16)] backdrop-blur-xs before:absolute before:inset-x-0 before:-top-1 before:-bottom-2 before:content-['']",
                  isDragging ? "cursor-grabbing" : "cursor-pointer",
                )}
              >
                {notches.map((center, index) => (
                  <span
                    key={NAV_ITEMS[index]?.id ?? index}
                    style={{ left: `${center}px` }}
                    className="bg-foreground/25 pointer-events-none absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  />
                ))}

                <div
                  style={{
                    transform: `translateX(${knob.centerX - KNOB_HALF}px) scale(${isDragging ? 1.06 : 1})`,
                  }}
                  className={clsx(
                    "bg-foreground pointer-events-none absolute -top-[3px] left-0 flex h-3.5 w-9 items-center justify-center rounded-full shadow-[0_1px_3px_rgba(24,20,17,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]",
                    knob.visible ? "opacity-100" : "opacity-0",
                    knob.animate &&
                      !isDragging &&
                      "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  )}
                >
                  <span className="bg-utils-scent-orange h-1.5 w-1.5 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
