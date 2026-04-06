import { useCallback, useEffect, useRef, useState } from "react";

interface CarouselItem {
  title: string;
  content: React.ReactNode;
}

interface StackedCarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
  cardClassName?: string;
}

export function StackedCarousel({
  items,
  autoPlay = false,
  interval = 4000,
  className = "",
}: StackedCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, items.length, next]);

  if (items.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only horizontal swipes (dx > dy in absolute terms)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className={`relative select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding rail */}
      <div className="overflow-hidden rounded-2xl" style={{ height: "100%" }}>
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${current * (100 / items.length)}%)`,
            width: `${items.length * 100}%`,
            transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              style={{ width: `${100 / items.length}%`, flexShrink: 0 }}
              className="h-full"
            >
              <div className="h-full w-full">{item.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot navigation */}
      {items.length > 1 && (
        <div className="flex items-center justify-center mt-3 gap-1.5">
          {items.map((item, idx) => (
            <button
              type="button"
              key={`dot-${item.title}-${idx}`}
              onClick={() => setCurrent(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className="transition-all duration-300 rounded-full"
              style={{
                width: idx === current ? 20 : 8,
                height: 8,
                background:
                  idx === current
                    ? "linear-gradient(90deg, #F2D27A, #D4AF37)"
                    : "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
