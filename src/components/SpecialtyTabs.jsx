import { useEffect, useRef, useState } from "react";
import { SPECIALTIES } from "../config/specialties";

export default function SpecialtyTabs({ activeTab, onTabChange, counts }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollShadows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollShadows();
    const el = scrollRef.current;
    if (!el) return;
    const onResize = () => updateScrollShadows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-1 w-8 bg-gradient-to-r from-fi-bg to-transparent z-10" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-fi-bg to-transparent z-10" />
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollShadows}
        role="tablist"
        aria-label="Filtrar por especialidade"
        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {Object.entries(SPECIALTIES).map(([key, specialty]) => {
          const isActive = activeTab === key;
          const count = counts?.[key];
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(key)}
              className={`h-8 shrink-0 inline-flex items-center gap-2 px-3 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-fi-accent bg-fi-soft text-fi-deep"
                  : "border-fi-line bg-white text-fi-ink hover:bg-fi-bg"
              }`}
            >
              {key !== "todas" && <span className={`h-2 w-2 rounded-sm ${specialty.bgColor}`} aria-hidden="true"></span>}
              <span>{specialty.name}</span>
              <span className="text-xs font-semibold tabular-nums opacity-70">{count || 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
