import { motion } from "motion/react";
import { useRef } from "react";

export type Category =
  | "All"
  | "Movies"
  | "Series"
  | "Shorts"
  | "Premium"
  | "Trending";

export const CATEGORIES: Category[] = [
  "All",
  "Movies",
  "Series",
  "Shorts",
  "Premium",
  "Trending",
];

const OCID_MAP: Record<Category, string> = {
  All: "home.all.tab",
  Movies: "home.movies.tab",
  Series: "home.series.tab",
  Shorts: "home.shorts.tab",
  Premium: "home.premium.tab",
  Trending: "home.trending.tab",
};

interface CategoryTabsProps {
  active: Category;
  onChange: (category: Category) => void;
}

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {CATEGORIES.map((category) => {
          const isActive = active === category;
          return (
            <motion.button
              key={category}
              type="button"
              data-ocid={OCID_MAP[category]}
              onClick={() => onChange(category)}
              whileTap={{ scale: 0.95 }}
              className={[
                "relative shrink-0 px-4 py-1.5 rounded-full text-sm font-medium",
                "transition-colors duration-200 focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "focus-visible:ring-offset-background",
                isActive
                  ? "bg-primary text-white font-semibold shadow-lg shadow-primary/30"
                  : "bg-[#1C1C1C] text-muted-foreground hover:text-foreground hover:bg-[#242424]",
              ].join(" ")}
              aria-pressed={isActive}
              aria-label={`Filter by ${category}`}
            >
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.7,
                }}
                transition={{ duration: 0.15 }}
              >
                {category}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
      {/* Fade edge indicators */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
