import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/languages";

export function LanguageSelector() {
  const { lang, setLanguage } = useLanguage();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  // Scroll selected item into view when the selector mounts
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSelect = (code: string) => {
    if (code === lang) return;
    setLanguage(code);
    toast.success("Language updated successfully", {
      duration: 2500,
      position: "top-center",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages..."
          className="w-full h-10 bg-[#1C1C1C] border border-white/10 rounded-2xl pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all"
          data-ocid="settings.language.search_input"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Language list */}
      <div
        className="overflow-y-auto rounded-2xl border border-white/8 bg-[#141414]"
        style={{ maxHeight: 400 }}
      >
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No languages found
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((language, i) => {
              const isSelected = lang === language.code;
              return (
                <li key={language.code}>
                  <button
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => handleSelect(language.code)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/8 active:bg-white/10 relative"
                    style={
                      isSelected
                        ? {
                            background: "rgba(255, 45, 45, 0.08)",
                            borderLeft: "3px solid #FF2D2D",
                            paddingLeft: "13px", // 16 - 3px border
                          }
                        : {}
                    }
                    data-ocid={`settings.language.item.${i + 1}`}
                    aria-pressed={isSelected}
                    aria-label={`Select ${language.name}`}
                  >
                    {/* Language names */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}
                        >
                          {language.name}
                        </span>
                        {language.rtl && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-md shrink-0">
                            RTL
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {language.nativeName}
                      </span>
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Current language hint */}
      <p className="text-xs text-muted-foreground text-center">
        {filtered.length > 0 ? `${LANGUAGES.length} languages available` : ""}
      </p>
    </div>
  );
}
