import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoPost } from "../backend.d";
import {
  useGetAiSearchHistory,
  useSaveAiSearchHistory,
} from "../hooks/useQueries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAiQuery(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Contains question mark → AI
  if (trimmed.includes("?")) return true;
  // 4+ words → treat as sentence → AI
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

function generateAiAnswer(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("movie") || q.includes("film"))
    return "Here are the best movie recommendations on SUB PREMIUM.";
  if (q.includes("series") || q.includes("show") || q.includes("episode"))
    return "Here are the top series picks for you on SUB PREMIUM.";
  if (q.includes("short"))
    return "Here are the best Shorts trending on SUB PREMIUM right now.";
  if (q.includes("trending") || q.includes("popular") || q.includes("hot"))
    return "Here's what's trending on SUB PREMIUM today.";
  if (q.includes("premium") || q.includes("exclusive"))
    return "Here are the exclusive Premium titles on SUB PREMIUM.";
  if (
    q.startsWith("how") ||
    q.startsWith("what") ||
    q.startsWith("why") ||
    q.startsWith("who") ||
    q.startsWith("when") ||
    q.startsWith("where")
  )
    return "Based on our content library, here's what I found for you.";
  return "I found some great content matching your query!";
}

function getSuggestedVideos(videos: VideoPost[], query: string): VideoPost[] {
  const q = query.toLowerCase().trim();
  if (!q) return videos.slice(0, 3);

  const keywords = q.split(/\s+/).filter((w) => w.length > 2);
  const scored = videos.map((v) => {
    let score = 0;
    const haystack = `${v.title} ${v.description}`.toLowerCase();
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 1;
    }
    return { video: v, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (matched.length > 0) return matched.slice(0, 3).map((s) => s.video);

  // Fallback: 3 most recent
  return [...videos]
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .slice(0, 3);
}

// ─── Sub-component: Suggested Video Mini Card ─────────────────────────────────

interface MiniVideoCardProps {
  video: VideoPost;
  index: number;
  onClick: () => void;
}

function MiniVideoCard({ video, index, onClick }: MiniVideoCardProps) {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = video.thumbnailBlob.getDirectURL();

  return (
    <motion.button
      type="button"
      data-ocid={`home.ai_panel.suggested_video.item.${index}`}
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left rounded-xl p-2
                 hover:bg-white/5 transition-colors duration-150
                 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div className="w-16 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
        {!imgError ? (
          <img
            src={thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-xs text-muted-foreground">🎬</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white line-clamp-1 leading-snug">
          {video.title}
        </p>
        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
          {video.description || "No description"}
        </p>
      </div>
    </motion.button>
  );
}

// ─── AI Response Panel ────────────────────────────────────────────────────────

interface AIPanelProps {
  query: string;
  videos: VideoPost[];
  onSearchInstead: () => void;
  onClear: () => void;
  onVideoClick: (v: VideoPost) => void;
  onAskAi: () => void;
}

function AIPanel({
  query,
  videos,
  onSearchInstead,
  onClear,
  onVideoClick,
  onAskAi,
}: AIPanelProps) {
  const answer = generateAiAnswer(query);
  const suggested = getSuggestedVideos(videos, query);

  return (
    <motion.div
      key="ai-panel"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="mt-2 bg-[#1A1A1A] border border-[#FF2D2D]/30 rounded-2xl p-4"
      data-ocid="home.ai_panel.card"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" role="img" aria-label="AI">
            🤖
          </span>
          <span className="text-sm font-bold text-white tracking-tight">
            AI Assistant
          </span>
          <span className="text-[10px] font-semibold text-[#FF2D2D] bg-[#FF2D2D]/10 px-1.5 py-0.5 rounded-full border border-[#FF2D2D]/20">
            BETA
          </span>
        </div>
        <button
          type="button"
          data-ocid="home.ai_panel.close_button"
          aria-label="Close AI panel"
          onClick={onClear}
          className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center
                     hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Direct answer */}
      <div className="mb-3 px-3 py-2.5 rounded-xl bg-[#FF2D2D]/8 border border-[#FF2D2D]/15">
        <p className="text-xs text-white/90 leading-relaxed">{answer}</p>
      </div>

      {/* Suggested videos */}
      {suggested.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {query.trim().split(/\s+/).length >= 4 || query.includes("?")
              ? "Suggested Videos"
              : "You might also like"}
          </p>
          <div className="space-y-0.5">
            {suggested.map((v, i) => (
              <MiniVideoCard
                key={v.id.toString()}
                video={v}
                index={i + 1}
                onClick={() => onVideoClick(v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ask AI chip */}
      <div className="mb-3">
        <button
          type="button"
          data-ocid="home.ai_panel.ask_ai_button"
          onClick={onAskAi}
          className="inline-flex items-center gap-1.5 text-xs font-semibold
                     text-[#FF2D2D] bg-[#FF2D2D]/10 border border-[#FF2D2D]/30
                     rounded-full px-3 py-1.5 hover:bg-[#FF2D2D]/20 transition-colors
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <span>🤖</span>
          Ask AI about this
        </button>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          data-ocid="home.ai_panel.search_instead_button"
          onClick={onSearchInstead}
          className="flex-1 text-xs font-semibold text-muted-foreground
                     hover:text-white transition-colors py-1.5 rounded-lg
                     hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          Search results instead
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button
          type="button"
          onClick={onClear}
          className="flex-1 text-xs font-semibold text-muted-foreground
                     hover:text-white transition-colors py-1.5 rounded-lg
                     hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          Clear
        </button>
      </div>
    </motion.div>
  );
}

// ─── Recent AI Searches (shown when input is focused + empty) ──────────────────

interface RecentAiChipsProps {
  entries: Array<{ searchQuery: string; timestamp: bigint }>;
  onSelect: (q: string) => void;
}

function RecentAiChips({ entries, onSelect }: RecentAiChipsProps) {
  if (entries.length === 0) return null;
  const recent = entries.slice(0, 5);

  return (
    <motion.div
      key="recent-chips"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="mt-2 px-1"
    >
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Recent AI searches
      </p>
      <div className="flex flex-wrap gap-1.5">
        {recent.map((entry, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: AI history entries have no stable id
            key={i}
            type="button"
            onClick={() => onSelect(entry.searchQuery)}
            className="inline-flex items-center gap-1 text-[11px] font-medium
                       text-[#FF2D2D]/80 bg-[#FF2D2D]/8 border border-[#FF2D2D]/20
                       rounded-full px-2.5 py-1 hover:bg-[#FF2D2D]/15 transition-colors
                       focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary
                       max-w-[160px] truncate"
          >
            <span>🤖</span>
            <span className="truncate">{entry.searchQuery}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AISearchBarProps {
  videos: VideoPost[];
  onSearch: (query: string) => void;
  onAiSearch?: (query: string) => void;
  onVideoClick?: (video: VideoPost) => void;
  /** Map of principal string → username for @user search matching */
  usernameMap?: Map<string, string>;
}

export function AISearchBar({
  videos,
  onSearch,
  onAiSearch,
  onVideoClick,
}: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [savedQuery, setSavedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: aiHistory } = useGetAiSearchHistory();
  const saveHistory = useSaveAiSearchHistory();

  const aiMode = isAiQuery(query);

  // When AI mode activates, open the panel
  useEffect(() => {
    if (aiMode && query.trim()) {
      setAiPanelOpen(true);
    } else if (!query.trim()) {
      setAiPanelOpen(false);
    }
  }, [aiMode, query]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (!isAiQuery(val)) {
        onSearch(val);
        setAiPanelOpen(false);
      }
    },
    [onSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;

        if (isAiQuery(trimmed)) {
          setAiPanelOpen(true);
          setSavedQuery(trimmed);
          saveHistory.mutate(trimmed);
          onAiSearch?.(trimmed);
        } else {
          onSearch(trimmed);
          setAiPanelOpen(false);
        }
      }
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [query, onSearch, onAiSearch, saveHistory],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setAiPanelOpen(false);
    setSavedQuery("");
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  const handleSearchInstead = useCallback(() => {
    setAiPanelOpen(false);
    onSearch(query);
  }, [query, onSearch]);

  const handleAskAi = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSavedQuery(trimmed);
    saveHistory.mutate(trimmed);
    onAiSearch?.(trimmed);
  }, [query, onAiSearch, saveHistory]);

  const handleRecentSelect = useCallback(
    (q: string) => {
      setQuery(q);
      setSavedQuery(q);
      setAiPanelOpen(true);
      onAiSearch?.(q);
    },
    [onAiSearch],
  );

  const showRecentChips =
    isFocused && !query.trim() && (aiHistory?.length ?? 0) > 0;

  const panelQuery = aiPanelOpen ? query || savedQuery : "";

  return (
    <div className="px-4 py-2">
      {/* Search input */}
      <div
        className={[
          "flex items-center gap-2 bg-[#1C1C1C] rounded-full px-4 py-2.5",
          "transition-all duration-200",
          aiMode && aiPanelOpen ? "animate-ai-pulse" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          aiMode && aiPanelOpen
            ? {
                boxShadow:
                  "0 0 0 2px #FF2D2D, 0 0 12px 2px rgba(255,45,45,0.35)",
              }
            : {
                boxShadow: isFocused
                  ? "0 0 0 1.5px rgba(255,45,45,0.4)"
                  : "none",
              }
        }
      >
        {/* Left icon */}
        <Search
          className={[
            "w-4 h-4 shrink-0 transition-colors duration-200",
            aiMode && aiPanelOpen ? "text-[#FF2D2D]" : "text-muted-foreground",
          ].join(" ")}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          data-ocid="home.ai_search.input"
          placeholder="Search creators, @users, videos"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent text-sm text-white
                     placeholder:text-muted-foreground outline-none border-none
                     min-w-0"
          aria-label="Search creators, users, or videos"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {/* Clear button */}
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              aria-label="Clear search"
              onClick={handleClear}
              className="shrink-0 text-muted-foreground hover:text-white
                         transition-colors focus-visible:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right: AI icon button */}
        <button
          type="button"
          data-ocid="home.ai_search.button"
          aria-label="AI search mode"
          onClick={() => inputRef.current?.focus()}
          className={[
            "shrink-0 text-base leading-none transition-all duration-200",
            "focus-visible:outline-none rounded-full",
            aiMode && aiPanelOpen
              ? "opacity-100 scale-110"
              : "opacity-50 hover:opacity-80",
          ].join(" ")}
        >
          🤖
        </button>
      </div>

      {/* AI panel + recent chips */}
      <AnimatePresence>
        {aiPanelOpen && panelQuery && (
          <AIPanel
            key="ai-panel"
            query={panelQuery}
            videos={videos}
            onSearchInstead={handleSearchInstead}
            onClear={handleClear}
            onVideoClick={(v) => onVideoClick?.(v)}
            onAskAi={handleAskAi}
          />
        )}
        {showRecentChips && !aiPanelOpen && (
          <RecentAiChips
            key="recent-chips"
            entries={aiHistory ?? []}
            onSelect={handleRecentSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
