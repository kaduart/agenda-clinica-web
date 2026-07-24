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
    <div className="relative bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-2 top-2 bottom-3 w-8 bg-gradient-to-r from-white to-transparent z-10 rounded-l-xl" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-2 top-2 bottom-3 w-8 bg-gradient-to-l from-white to-transparent z-10 rounded-r-xl" />
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
              className={`
                flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shrink-0 min-w-[100px]
                ${
                  isActive
                    ? `${specialty.bgColor} text-white shadow-sm` // fundo escuro, texto branco
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <i
                className={`fas ${specialty.icon} ${
                  isActive ? 'text-white' : specialty.textColor // ícone colorido quando inativo
                }`}
              ></i>
              <span>{specialty.name}</span>
              {!!count && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none ${
                    isActive ? 'bg-white/25 text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
