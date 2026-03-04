import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Languages,
  ListVideo,
  Loader2,
  MessageCircle,
  Mic2,
  MonitorPlay,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Subtitles,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoPost } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddVideoToPlaylist,
  useCreatePlaylist,
  useGetUsername,
  useGetUsernameByPrincipal,
  useListMyPlaylists,
  useRecordWatchHistory,
} from "../hooks/useQueries";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/languages";
import { updateActiveStatus } from "../utils/activeStatus";
import { OnlineStatusDot } from "./OnlineStatusDot";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isAiSuggested?: boolean;
}

interface Comment {
  id: string;
  videoId: string;
  author: string;
  text: string;
  timestamp: number;
  replies: Reply[];
}

// ─── Player settings types ────────────────────────────────────────────────────

type QualityOption = "Auto" | "1080p" | "720p" | "480p" | "360p";
type SpeedOption = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
type SubtitleLang = "off" | "en" | "es" | "fr" | "ar" | "hi" | "auto";
type AudioOption = "original" | "dubbed";
type SettingsSection = "quality" | "speed" | "subtitles" | "audio" | null;

const QUALITY_OPTIONS: QualityOption[] = [
  "Auto",
  "1080p",
  "720p",
  "480p",
  "360p",
];
const SPEED_OPTIONS: { value: SpeedOption; label: string }[] = [
  { value: 0.5, label: "0.5×" },
  { value: 0.75, label: "0.75×" },
  { value: 1, label: "Normal" },
  { value: 1.25, label: "1.25×" },
  { value: 1.5, label: "1.5×" },
  { value: 2, label: "2×" },
];
const SUBTITLE_OPTIONS: {
  value: SubtitleLang;
  label: string;
  langName: string;
}[] = [
  { value: "off", label: "OFF", langName: "Off" },
  { value: "en", label: "English", langName: "English" },
  { value: "es", label: "Spanish", langName: "Español" },
  { value: "fr", label: "French", langName: "Français" },
  { value: "ar", label: "Arabic", langName: "العربية" },
  { value: "hi", label: "Hindi", langName: "हिन्दी" },
  { value: "auto", label: "Auto-Translate", langName: "Auto-Translate" },
];
const SUPPORTED_SUBTITLE_LANGS: SubtitleLang[] = ["en", "es", "fr", "ar", "hi"];

// Mock subtitle lines for demo
const SUBTITLE_LINES_BY_LANG: Record<string, string[]> = {
  en: [
    "Welcome to this video.",
    "Today we explore something amazing.",
    "Stay tuned for more content.",
    "This is a subtitle demonstration.",
    "Thanks for watching!",
  ],
  es: [
    "Bienvenido a este video.",
    "Hoy exploramos algo increíble.",
    "Mantente atento para más contenido.",
    "Esta es una demostración de subtítulos.",
    "¡Gracias por ver!",
  ],
  fr: [
    "Bienvenue dans cette vidéo.",
    "Aujourd'hui, nous explorons quelque chose d'incroyable.",
    "Restez à l'écoute pour plus de contenu.",
    "Ceci est une démonstration de sous-titres.",
    "Merci de regarder!",
  ],
  ar: [
    "مرحباً بكم في هذا الفيديو.",
    "اليوم نستكشف شيئاً رائعاً.",
    "ابقوا معنا لمزيد من المحتوى.",
    "هذا عرض توضيحي للترجمة.",
    "شكراً على المشاهدة!",
  ],
  hi: [
    "इस वीडियो में आपका स्वागत है।",
    "आज हम कुछ अद्भुत खोजते हैं।",
    "अधिक सामग्री के लिए बने रहें।",
    "यह उपशीर्षक प्रदर्शन है।",
    "देखने के लिए धन्यवाद!",
  ],
};

function getSubtitleLines(lang: string, title: string): string[] {
  const cacheKey = `subtitles-${title}-${lang}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as string[];
  } catch {
    /* ignore */
  }
  return SUBTITLE_LINES_BY_LANG[lang] ?? SUBTITLE_LINES_BY_LANG.en;
}

function cacheSubtitleLines(
  lang: string,
  title: string,
  lines: string[],
): void {
  try {
    localStorage.setItem(`subtitles-${title}-${lang}`, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

function getTranslatedTitle(videoId: string, lang: string): string | null {
  try {
    const cached = localStorage.getItem(`translated-title-${videoId}-${lang}`);
    if (cached) return cached;
  } catch {
    /* ignore */
  }
  return null;
}

function cacheTranslatedTitle(
  videoId: string,
  lang: string,
  translated: string,
): void {
  try {
    localStorage.setItem(`translated-title-${videoId}-${lang}`, translated);
  } catch {
    /* ignore */
  }
}

function getTranslatedDescription(
  videoId: string,
  lang: string,
): string | null {
  try {
    return localStorage.getItem(`translated-desc-${videoId}-${lang}`);
  } catch {
    return null;
  }
}

function cacheTranslatedDescription(
  videoId: string,
  lang: string,
  text: string,
): void {
  try {
    localStorage.setItem(`translated-desc-${videoId}-${lang}`, text);
  } catch {
    /* ignore */
  }
}

function getLangName(langCode: string): string {
  const found = LANGUAGES.find((l) => l.code === langCode);
  return found?.name ?? langCode;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadComments(videoId: string): Comment[] {
  try {
    const raw = localStorage.getItem(`comments-${videoId}`);
    if (!raw) return [];
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

function saveComments(videoId: string, comments: Comment[]): void {
  try {
    localStorage.setItem(`comments-${videoId}`, JSON.stringify(comments));
  } catch {
    // ignore storage errors
  }
}

function getDailyAiUsageKey(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ai-reply-daily-${date}`;
}

function getDailyAiUsage(): number {
  try {
    const raw = localStorage.getItem(getDailyAiUsageKey());
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function incrementDailyAiUsage(): void {
  try {
    const key = getDailyAiUsageKey();
    const current = getDailyAiUsage();
    localStorage.setItem(key, (current + 1).toString());
  } catch {
    // ignore
  }
}

function getPerCommentAiUsage(commentId: string): number {
  try {
    const raw = localStorage.getItem(`ai-reply-count-${commentId}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function incrementPerCommentAiUsage(commentId: string): void {
  try {
    const key = `ai-reply-count-${commentId}`;
    const current = getPerCommentAiUsage(commentId);
    localStorage.setItem(key, (current + 1).toString());
  } catch {
    // ignore
  }
}

// ─── AI Reply Simulation ──────────────────────────────────────────────────────

function generateAiReply(
  commentText: string,
  videoTitle: string,
  creatorName: string,
): string {
  const text = commentText.toLowerCase();
  const isQuestion = commentText.includes("?");
  const isPositive =
    /love|great|amazing|awesome|best|fantastic|incredible|fire|goat|perfect|beautiful|excellent/i.test(
      text,
    );
  const isNegative =
    /bad|terrible|awful|hate|worst|boring|trash|disappointing|wrong|disagree/i.test(
      text,
    );
  const isShort = commentText.trim().length < 20;

  if (isQuestion) {
    return `Hey! Great question 🙌 Thanks for watching "${videoTitle}"! I'd love to help with that — feel free to drop any follow-up questions in the comments and I'll get back to you as soon as I can. Stay tuned for more content coming soon! — ${creatorName}`;
  }
  if (isPositive) {
    return `Thank you so much, this really made my day! 🙏❤️ Comments like yours are exactly what keep me going on "${videoTitle}". I really appreciate the support — make sure to subscribe so you don't miss the next one! — ${creatorName}`;
  }
  if (isNegative) {
    return `Thank you for the honest feedback on "${videoTitle}" — I really value your perspective! 🙏 I'm always looking to improve and your comment helps me do that. I'll take this onboard for future videos. Hope to win you over with the next one! — ${creatorName}`;
  }
  if (isShort) {
    return `Thanks for watching "${videoTitle}" and taking the time to comment! 🎬 Really means a lot. Don't forget to subscribe for more content, and feel free to share your thoughts anytime! — ${creatorName}`;
  }
  return `Thank you so much for your thoughtful comment on "${videoTitle}"! 🙌 It's wonderful to hear from the community. Your engagement means the world — I read every comment. Stay tuned for more great content and make sure you're subscribed! — ${creatorName}`;
}

// ─── Relative time ────────────────────────────────────────────────────────────

function formatRelativeTime(timestampNs: bigint): string {
  const ms = Number(timestampNs / BigInt(1_000_000));
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function formatCommentTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

// ─── VideoPlayerModalProps ────────────────────────────────────────────────────

interface VideoPlayerModalProps {
  post: VideoPost | null;
  open: boolean;
  onClose: () => void;
}

// ─── SubtitleOverlay ──────────────────────────────────────────────────────────

function SubtitleOverlay({
  subtitleLang,
  isTranslating,
  subtitleLines,
}: {
  subtitleLang: SubtitleLang;
  isTranslating: boolean;
  subtitleLines: string[];
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cycle through subtitle lines every 4 seconds
  useEffect(() => {
    if (subtitleLang === "off" || subtitleLines.length === 0) return;
    setLineIndex(0);
    setVisible(true);
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setLineIndex((prev) => (prev + 1) % subtitleLines.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [subtitleLang, subtitleLines]);

  if (subtitleLang === "off") return null;

  return (
    <div
      className="absolute bottom-14 left-0 right-0 flex flex-col items-center z-20 pointer-events-none px-4"
      data-ocid="player.subtitles.overlay"
    >
      <AnimatePresence>
        {isTranslating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 bg-black/70 rounded-xl px-3 py-1.5"
            data-ocid="player.subtitles.loading_state"
          >
            <Loader2 className="w-3 h-3 animate-spin text-white/80" />
            <span className="text-white/80 text-xs font-medium">
              Translating…
            </span>
          </motion.div>
        ) : subtitleLines.length > 0 && visible ? (
          <motion.div
            key={`subtitle-${lineIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-black/60 rounded-lg px-3 py-1 max-w-[80%] text-center"
            style={{ direction: subtitleLang === "ar" ? "rtl" : "ltr" }}
          >
            <span className="text-white text-sm leading-snug font-medium drop-shadow-sm">
              {subtitleLines[lineIndex]}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── PlayerSettingsModal ──────────────────────────────────────────────────────

function PlayerSettingsModal({
  open,
  onClose,
  quality,
  onQualityChange,
  speed,
  onSpeedChange,
  subtitleLang,
  onSubtitleChange,
  audioOption,
  onAudioChange,
  isTranslating,
}: {
  open: boolean;
  onClose: () => void;
  quality: QualityOption;
  onQualityChange: (q: QualityOption) => void;
  speed: SpeedOption;
  onSpeedChange: (s: SpeedOption) => void;
  subtitleLang: SubtitleLang;
  onSubtitleChange: (s: SubtitleLang) => void;
  audioOption: AudioOption;
  onAudioChange: (a: AudioOption) => void;
  isTranslating: boolean;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);

  const sections: {
    key: SettingsSection;
    label: string;
    icon: React.ReactNode;
    value: string;
  }[] = [
    {
      key: "quality",
      label: "Quality",
      icon: <MonitorPlay className="w-4 h-4" />,
      value: quality,
    },
    {
      key: "speed",
      label: "Playback Speed",
      icon: <Zap className="w-4 h-4" />,
      value: speed === 1 ? "Normal" : `${speed}×`,
    },
    {
      key: "subtitles",
      label: "Subtitles",
      icon: <Subtitles className="w-4 h-4" />,
      value:
        subtitleLang === "off"
          ? "OFF"
          : subtitleLang === "auto"
            ? "Auto-Translate"
            : (SUBTITLE_OPTIONS.find((s) => s.value === subtitleLang)?.label ??
              subtitleLang),
    },
    {
      key: "audio",
      label: "Audio Language",
      icon: <Mic2 className="w-4 h-4" />,
      value: audioOption === "original" ? "Original" : "Dubbed",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-lg"
            data-ocid="player.settings.modal"
          >
            <div className="bg-[#1a1a1a] border border-white/10 rounded-t-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="text-sm font-bold text-white/90 uppercase tracking-widest">
                  Player Settings
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
                  aria-label="Close settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-px bg-white/10 mx-5" />

              {/* Sections */}
              <div className="py-3 pb-6">
                {sections.map((section) => (
                  <div key={section.key}>
                    {/* Section row */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection(
                          activeSection === section.key ? null : section.key,
                        )
                      }
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white/50">{section.icon}</span>
                      <span className="flex-1 text-sm font-medium text-white/90 text-left">
                        {section.label}
                      </span>
                      <span className="text-xs text-[#FF2D2D] font-semibold mr-2">
                        {section.value}
                        {section.key === "subtitles" && isTranslating && (
                          <Loader2 className="inline w-3 h-3 animate-spin ml-1" />
                        )}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-white/30 transition-transform duration-200 ${activeSection === section.key ? "rotate-90" : ""}`}
                      />
                    </button>

                    {/* Expanded options */}
                    <AnimatePresence>
                      {activeSection === section.key && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-black/30"
                        >
                          <div className="px-5 py-2 space-y-1">
                            {/* Quality options */}
                            {section.key === "quality" && (
                              <div data-ocid="player.settings.quality.select">
                                {QUALITY_OPTIONS.map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                      onQualityChange(q);
                                      setActiveSection(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                  >
                                    {quality === q ? (
                                      <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                    ) : (
                                      <span className="w-4 h-4 shrink-0" />
                                    )}
                                    <span
                                      className={`text-sm ${quality === q ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                    >
                                      {q}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Speed options */}
                            {section.key === "speed" && (
                              <div data-ocid="player.settings.speed.select">
                                {SPEED_OPTIONS.map(({ value, label }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      onSpeedChange(value);
                                      setActiveSection(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                  >
                                    {speed === value ? (
                                      <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                    ) : (
                                      <span className="w-4 h-4 shrink-0" />
                                    )}
                                    <span
                                      className={`text-sm ${speed === value ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                    >
                                      {label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Subtitle options */}
                            {section.key === "subtitles" && (
                              <div data-ocid="player.settings.subtitles.select">
                                {SUBTITLE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      onSubtitleChange(opt.value);
                                      setActiveSection(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                  >
                                    {subtitleLang === opt.value ? (
                                      <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                    ) : (
                                      <span className="w-4 h-4 shrink-0" />
                                    )}
                                    <span
                                      className={`text-sm flex-1 text-left ${subtitleLang === opt.value ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                    >
                                      {opt.label}
                                    </span>
                                    {opt.value !== "off" &&
                                      opt.value !== "auto" && (
                                        <span className="text-xs text-white/30">
                                          {opt.langName}
                                        </span>
                                      )}
                                    {opt.value === "auto" && (
                                      <span className="text-[10px] bg-[#FF2D2D]/20 text-[#FF2D2D] rounded-full px-2 py-0.5 font-semibold">
                                        AI
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Audio language options */}
                            {section.key === "audio" && (
                              <div data-ocid="player.settings.audio.select">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAudioChange("original");
                                    setActiveSection(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                  {audioOption === "original" ? (
                                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm flex-1 text-left ${audioOption === "original" ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                  >
                                    Original
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50 cursor-not-allowed"
                                >
                                  <span className="w-4 h-4 shrink-0" />
                                  <span className="text-sm text-white/40 flex-1 text-left">
                                    Dubbed
                                  </span>
                                  <span className="text-[10px] bg-white/10 text-white/40 rounded-full px-2 py-0.5 font-semibold">
                                    Coming Soon
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Translated Title Panel ───────────────────────────────────────────────────

function TranslatedTitlePanel({
  videoId,
  originalTitle,
  originalDescription,
  lang,
  subtitleLang,
}: {
  videoId: string;
  originalTitle: string;
  originalDescription?: string;
  lang: string;
  subtitleLang: SubtitleLang;
}) {
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const shouldTranslate = lang !== "en" && subtitleLang !== "off";

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depends on lang and subtitleLang
  useEffect(() => {
    if (!shouldTranslate) {
      setTranslatedTitle(null);
      setTranslatedDesc(null);
      return;
    }

    // Check cache first
    const cachedTitle = getTranslatedTitle(videoId, lang);
    const cachedDesc = originalDescription
      ? getTranslatedDescription(videoId, lang)
      : null;

    if (cachedTitle) {
      setTranslatedTitle(cachedTitle);
      if (cachedDesc) setTranslatedDesc(cachedDesc);
      return;
    }

    // Simulate translation
    setIsGenerating(true);
    const langName = getLangName(lang);
    const timeout = setTimeout(() => {
      const mockTitle = `[${langName}] ${originalTitle}`;
      const mockDesc = originalDescription
        ? `[${langName}] ${originalDescription}`
        : null;

      setTranslatedTitle(mockTitle);
      if (mockDesc) setTranslatedDesc(mockDesc);
      cacheTranslatedTitle(videoId, lang, mockTitle);
      if (mockDesc) cacheTranslatedDescription(videoId, lang, mockDesc);
      setIsGenerating(false);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [videoId, lang, subtitleLang, shouldTranslate]);

  if (!shouldTranslate) return null;

  return (
    <div
      className="px-4 py-3 bg-primary/5 border border-primary/15 rounded-2xl mx-4 mb-3"
      data-ocid="player.translated_title.panel"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Languages className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
          {getLangName(lang)} Translation
        </span>
        {isGenerating && (
          <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />
        )}
      </div>

      {isGenerating ? (
        <div className="space-y-1.5">
          <div className="h-4 bg-primary/10 rounded-lg animate-pulse w-3/4" />
          <div className="h-3 bg-primary/10 rounded-lg animate-pulse w-full" />
          <div className="h-3 bg-primary/10 rounded-lg animate-pulse w-2/3" />
        </div>
      ) : (
        <>
          {translatedTitle && (
            <p className="text-sm font-semibold text-foreground leading-snug mb-1">
              {translatedTitle}
            </p>
          )}
          {translatedDesc && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {translatedDesc}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Save to Playlist Sheet ───────────────────────────────────────────────────

function SaveToPlaylistSheet({
  videoId,
  open,
  onClose,
}: {
  videoId: bigint;
  open: boolean;
  onClose: () => void;
}) {
  const { data: playlists, isLoading } = useListMyPlaylists();
  const addVideoToPlaylist = useAddVideoToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setAddedIds(new Set());
      setCreatingNew(false);
      setNewName("");
    }
  }, [open]);

  useEffect(() => {
    if (creatingNew) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [creatingNew]);

  const handleAddToPlaylist = async (
    playlistId: bigint,
    playlistName: string,
  ) => {
    const key = playlistId.toString();
    try {
      await addVideoToPlaylist.mutateAsync({ playlistId, videoId });
      setAddedIds((prev) => new Set([...prev, key]));
      toast.success(`Added to "${playlistName}"`);
    } catch {
      toast.error("Failed to add to playlist");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    try {
      const id = await createPlaylist.mutateAsync(newName.trim());
      await addVideoToPlaylist.mutateAsync({ playlistId: id, videoId });
      setAddedIds((prev) => new Set([...prev, id.toString()]));
      toast.success(`Created "${newName.trim()}" and added video`);
      setCreatingNew(false);
      setNewName("");
    } catch {
      toast.error("Failed to create playlist");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-border/30 rounded-t-3xl p-0 max-h-[70vh]"
        data-ocid="home.video.playlist.sheet"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              Save to Playlist
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="h-px bg-border/20 mx-5" />

        <ScrollArea className="flex-1 max-h-[45vh]">
          <div className="px-5 py-3 space-y-2">
            {creatingNew ? (
              <div className="flex items-center gap-2 bg-secondary/40 rounded-2xl p-3">
                <Input
                  ref={inputRef}
                  placeholder="Playlist name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateAndAdd();
                    if (e.key === "Escape") setCreatingNew(false);
                  }}
                  className="h-9 flex-1 bg-secondary/60 border-border/40 text-foreground text-sm rounded-xl"
                  data-ocid="home.video.playlist.input"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateAndAdd()}
                  disabled={
                    createPlaylist.isPending || addVideoToPlaylist.isPending
                  }
                  className="h-9 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  data-ocid="home.video.playlist.submit_button"
                >
                  {createPlaylist.isPending || addVideoToPlaylist.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="h-9 px-2 text-muted-foreground hover:text-foreground text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl px-4 py-3 transition-colors"
                data-ocid="home.video.playlist.primary_button"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Create New Playlist
                </span>
              </button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !playlists || playlists.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No playlists yet — create one above
              </div>
            ) : (
              playlists.map((playlist, i) => {
                const isAdded = addedIds.has(playlist.id.toString());
                return (
                  <div
                    key={playlist.id.toString()}
                    className="flex items-center gap-3 bg-secondary/40 rounded-2xl px-4 py-3"
                    data-ocid={`home.video.playlist.item.${i + 1}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <ListVideo className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.videoIds.length} videos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        !isAdded &&
                        void handleAddToPlaylist(playlist.id, playlist.name)
                      }
                      disabled={isAdded || addVideoToPlaylist.isPending}
                      className={`h-8 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        isAdded
                          ? "bg-green-500/20 text-green-400 cursor-default"
                          : "bg-primary/20 hover:bg-primary/30 text-primary"
                      }`}
                      data-ocid={`home.video.playlist.save_button.${i + 1}`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Added
                        </>
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── AI Reply Box ─────────────────────────────────────────────────────────────

function AiReplyBox({
  comment,
  videoTitle,
  creatorName,
  onPost,
  onDiscard,
}: {
  comment: Comment;
  videoTitle: string;
  creatorName: string;
  onPost: (text: string) => void;
  onDiscard: () => void;
}) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiCount, setAiCount] = useState(() =>
    getPerCommentAiUsage(comment.id),
  );
  const MAX_PER_COMMENT = 5;
  const MAX_DAILY = 20;

  const fetchSuggestion = async () => {
    if (aiCount >= MAX_PER_COMMENT) {
      toast.error("Limit reached for this comment (max 5)");
      return;
    }
    if (getDailyAiUsage() >= MAX_DAILY) {
      toast.error("Daily limit reached (max 20 AI replies per day)");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const reply = generateAiReply(comment.text, videoTitle, creatorName);
    setSuggestion(reply);
    incrementPerCommentAiUsage(comment.id);
    incrementDailyAiUsage();
    setAiCount((c) => c + 1);
    setLoading(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount
  useEffect(() => {
    void fetchSuggestion();
  }, []);

  const handleRegenerate = () => {
    void fetchSuggestion();
  };

  if (aiCount >= MAX_PER_COMMENT && !suggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="mt-2 rounded-2xl bg-secondary/30 border border-border/30 px-4 py-3 text-xs text-muted-foreground text-center"
        data-ocid="comments.ai_reply.error_state"
      >
        Limit reached for this comment
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      className="mt-2 rounded-2xl bg-secondary/30 border border-primary/20 p-3 space-y-2"
      data-ocid="comments.ai_reply.panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">AI Suggestion</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {aiCount}/{MAX_PER_COMMENT} uses
        </span>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs"
          data-ocid="comments.ai_reply.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Generating AI reply…
        </div>
      ) : (
        <Textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          rows={4}
          className="w-full bg-secondary/60 border-border/30 text-foreground text-xs rounded-xl resize-none focus-visible:ring-primary/40"
          placeholder="AI reply will appear here..."
          data-ocid="comments.ai_reply.textarea"
        />
      )}

      {!loading && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => onPost(suggestion)}
            disabled={!suggestion.trim()}
            className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex-1"
            data-ocid="comments.ai_reply.submit_button"
          >
            Post Reply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={
              aiCount >= MAX_PER_COMMENT || getDailyAiUsage() >= MAX_DAILY
            }
            className="h-8 px-3 rounded-xl border-border/40 text-foreground text-xs font-semibold bg-secondary/40"
            data-ocid="comments.ai_reply.secondary_button"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            className="h-8 px-3 rounded-xl text-muted-foreground text-xs"
            data-ocid="comments.ai_reply.cancel_button"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Discard
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  videoTitle,
  creatorName,
  currentUser,
  onReplyPosted,
  onDeleteComment,
}: {
  comment: Comment;
  videoTitle: string;
  creatorName: string;
  currentUser: string;
  onReplyPosted: (commentId: string, reply: Reply) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);
  const [aiCount, setAiCount] = useState(() =>
    getPerCommentAiUsage(comment.id),
  );
  const MAX_PER_COMMENT = 5;
  const MAX_DAILY = 20;
  const initials = comment.author.slice(0, 2).toUpperCase();

  const handlePostReply = () => {
    if (!replyText.trim()) return;
    const reply: Reply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: currentUser,
      text: replyText.trim(),
      timestamp: Date.now(),
    };
    onReplyPosted(comment.id, reply);
    setReplyText("");
    setShowReplyInput(false);
    setShowReplies(true);
  };

  const handleAiPost = (text: string) => {
    if (!text.trim()) return;
    const reply: Reply = {
      id: `${Date.now()}-ai-${Math.random().toString(36).slice(2, 8)}`,
      author: currentUser,
      text: text.trim(),
      timestamp: Date.now(),
      isAiSuggested: true,
    };
    onReplyPosted(comment.id, reply);
    setShowAiBox(false);
    setShowReplies(true);
    setAiCount(getPerCommentAiUsage(comment.id));
  };

  const canUseAi = aiCount < MAX_PER_COMMENT && getDailyAiUsage() < MAX_DAILY;

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3 bg-secondary/20 rounded-2xl p-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-foreground truncate">
              @{comment.author}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatCommentTime(comment.timestamp)}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed break-words">
            {comment.text}
          </p>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setShowReplyInput((p) => !p);
                setShowAiBox(false);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              data-ocid="comments.reply.button"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Reply
            </button>

            <button
              type="button"
              onClick={() => {
                if (!canUseAi) {
                  const dailyUsed = getDailyAiUsage() >= MAX_DAILY;
                  toast.error(
                    dailyUsed
                      ? "Daily limit reached (max 20 AI replies per day)"
                      : "Limit reached for this comment (max 5)",
                    { id: "ai-limit" },
                  );
                  return;
                }
                setShowAiBox((p) => !p);
                setShowReplyInput(false);
              }}
              disabled={!canUseAi && !showAiBox}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                canUseAi
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/50 cursor-not-allowed"
              }`}
              data-ocid="comments.ai_reply.button"
            >
              <Wand2 className="w-3.5 h-3.5" />
              AI Reply
            </button>

            {comment.replies.length > 0 && (
              <button
                type="button"
                onClick={() => setShowReplies((p) => !p)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                data-ocid="comments.replies.toggle"
              >
                {showReplies ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {comment.replies.length}{" "}
                {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}

            {comment.author === currentUser && (
              <button
                type="button"
                onClick={() => onDeleteComment(comment.id)}
                className="flex items-center gap-1 text-xs text-destructive/60 hover:text-destructive transition-colors ml-auto"
                aria-label="Delete comment"
                data-ocid="comments.comment.delete_button"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual reply input */}
      <AnimatePresence>
        {showReplyInput && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="ml-11 flex gap-2"
          >
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handlePostReply();
              }}
              placeholder="Write a reply..."
              className="flex-1 h-9 bg-secondary/50 border-border/30 text-foreground text-xs rounded-xl"
              data-ocid="comments.reply.input"
            />
            <button
              type="button"
              onClick={handlePostReply}
              disabled={!replyText.trim()}
              className="h-9 w-9 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors disabled:opacity-40"
              data-ocid="comments.reply.submit_button"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI reply box */}
      <AnimatePresence>
        {showAiBox && (
          <div className="ml-11">
            <AiReplyBox
              comment={comment}
              videoTitle={videoTitle}
              creatorName={creatorName}
              onPost={handleAiPost}
              onDiscard={() => setShowAiBox(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Replies list */}
      <AnimatePresence>
        {showReplies && comment.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-11 space-y-1.5 overflow-hidden"
          >
            {comment.replies.map((reply) => (
              <div
                key={reply.id}
                className="flex items-start gap-2 bg-secondary/15 rounded-xl p-2.5"
              >
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-[10px] text-primary">
                  {reply.author.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">
                      @{reply.author}
                    </span>
                    {reply.isAiSuggested && (
                      <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
                        <Wand2 className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatCommentTime(reply.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed break-words">
                    {reply.text}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Comment Section ──────────────────────────────────────────────────────────

function CommentSection({
  videoId,
  videoTitle,
  creatorName,
}: {
  videoId: string;
  videoTitle: string;
  creatorName: string;
}) {
  const { data: username } = useGetUsername();
  const currentUser = username ?? "Anonymous";
  const [comments, setComments] = useState<Comment[]>(() =>
    loadComments(videoId),
  );
  const [newComment, setNewComment] = useState("");

  const persistComments = (updated: Comment[]) => {
    setComments(updated);
    saveComments(videoId, updated);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      videoId,
      author: currentUser,
      text: newComment.trim(),
      timestamp: Date.now(),
      replies: [],
    };
    persistComments([comment, ...comments]);
    setNewComment("");
  };

  const handleReplyPosted = (commentId: string, reply: Reply) => {
    persistComments(
      comments.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
      ),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    persistComments(comments.filter((c) => c.id !== commentId));
  };

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Comments</span>
        <Badge
          variant="secondary"
          className="text-xs bg-secondary/60 text-muted-foreground rounded-full"
        >
          {comments.length}
        </Badge>
      </div>

      {/* Add comment input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleAddComment();
          }}
          placeholder="Add a comment..."
          className="flex-1 h-10 bg-secondary/40 border-border/30 text-foreground text-sm rounded-2xl"
          data-ocid="comments.add.input"
        />
        <button
          type="button"
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="h-10 w-10 rounded-2xl bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
          data-ocid="comments.add.submit_button"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div
          className="text-center py-8 text-muted-foreground text-sm"
          data-ocid="comments.list.empty_state"
        >
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No comments yet. Be the first!
        </div>
      ) : (
        <div className="space-y-3" data-ocid="comments.list">
          {comments.map((comment, i) => (
            <div key={comment.id} data-ocid={`comments.item.${i + 1}`}>
              <CommentItem
                comment={comment}
                videoTitle={videoTitle}
                creatorName={creatorName}
                currentUser={currentUser}
                onReplyPosted={handleReplyPosted}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────

export function VideoPlayerModal({
  post,
  open,
  onClose,
}: VideoPlayerModalProps) {
  const { data: username } = useGetUsernameByPrincipal(post?.uploader);
  const { identity } = useInternetIdentity();
  const { lang } = useLanguage();
  const recordWatchHistory = useRecordWatchHistory();
  const [playlistSheetOpen, setPlaylistSheetOpen] = useState(false);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quality, setQuality] = useState<QualityOption>("Auto");
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [subtitleLang, setSubtitleLang] = useState<SubtitleLang>("off");
  const [audioOption, setAudioOption] = useState<AudioOption>("original");
  const [isTranslating, setIsTranslating] = useState(false);
  const [subtitleLines, setSubtitleLines] = useState<string[]>([]);

  // Auto-detect subtitle language from user's preferred language
  useEffect(() => {
    if (!open) return;
    const supportedLang = SUPPORTED_SUBTITLE_LANGS.includes(
      lang as SubtitleLang,
    )
      ? (lang as SubtitleLang)
      : "off";
    setSubtitleLang(supportedLang);
  }, [open, lang]);

  // Handle subtitle language change — load or simulate translation
  const handleSubtitleChange = useCallback(
    async (newLang: SubtitleLang) => {
      setSubtitleLang(newLang);
      if (newLang === "off") {
        setSubtitleLines([]);
        return;
      }

      const videoId = post?.id.toString() ?? "";
      const title = post?.title ?? "";

      if (newLang === "auto") {
        // Auto-translate: check cache first
        const cacheKey = `subtitles-${videoId}-auto`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setSubtitleLines(JSON.parse(cached) as string[]);
            return;
          }
        } catch {
          /* ignore */
        }

        setIsTranslating(true);
        await new Promise((r) => setTimeout(r, 1500));
        const autoLines = [
          `[Auto-Translated] ${SUBTITLE_LINES_BY_LANG.en[0]}`,
          `[Auto-Translated] ${SUBTITLE_LINES_BY_LANG.en[1]}`,
          `[Auto-Translated] ${SUBTITLE_LINES_BY_LANG.en[2]}`,
          `[Auto-Translated] ${SUBTITLE_LINES_BY_LANG.en[3]}`,
          `[Auto-Translated] ${SUBTITLE_LINES_BY_LANG.en[4]}`,
        ];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(autoLines));
        } catch {
          /* ignore */
        }
        setSubtitleLines(autoLines);
        setIsTranslating(false);
        return;
      }

      // Standard language: check cache then use built-in or simulate
      const lines = getSubtitleLines(newLang, title);
      if (!SUBTITLE_LINES_BY_LANG[newLang]) {
        // Simulate translation delay for non-built-in langs
        setIsTranslating(true);
        await new Promise((r) => setTimeout(r, 1500));
        cacheSubtitleLines(newLang, title, lines);
        setIsTranslating(false);
      }
      setSubtitleLines(lines);
    },
    [post],
  );

  // Load subtitle lines when modal opens with auto-detected language
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depends on open and lang
  useEffect(() => {
    if (!open || !post) return;
    const supportedLang = SUPPORTED_SUBTITLE_LANGS.includes(
      lang as SubtitleLang,
    )
      ? (lang as SubtitleLang)
      : "off";
    if (supportedLang !== "off") {
      void handleSubtitleChange(supportedLang);
    }
  }, [open, post?.id]);

  // Apply playback speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Record watch history and update active status when modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only trigger on open/post id change
  useEffect(() => {
    if (open && post) {
      recordWatchHistory.mutate(post.id);
      const principalId = identity?.getPrincipal().toString();
      if (principalId) updateActiveStatus(principalId);
    }
  }, [open, post?.id]);

  if (!post) return null;

  const videoUrl = post.videoBlob.getDirectURL();
  const creatorName = username ?? "anonymous";
  const videoIdStr = post.id.toString();

  // Creator online status from localStorage
  const creatorPrincipalStr = post.uploader?.toString() ?? "";
  const creatorLastActive = creatorPrincipalStr
    ? (() => {
        try {
          const raw = localStorage.getItem(
            `last-active-${creatorPrincipalStr}`,
          );
          return raw ? Number(raw) : null;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="bg-card border-border/50 p-0 max-w-lg w-full rounded-3xl overflow-hidden"
          data-ocid="home.video.modal"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-50 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            aria-label="Close video"
            data-ocid="home.video.close_button"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable content */}
          <ScrollArea className="max-h-[90vh]">
            {/* Video player container */}
            <div className="relative bg-black aspect-video w-full">
              {/* biome-ignore lint/a11y/useMediaCaption: user-generated content; custom subtitles overlay provided */}
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
                playsInline
              />

              {/* Subtitle Overlay */}
              <SubtitleOverlay
                subtitleLang={subtitleLang}
                isTranslating={isTranslating}
                subtitleLines={subtitleLines}
              />

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="absolute bottom-3 right-3 z-30 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 shadow-lg"
                aria-label="Player settings"
                data-ocid="player.settings.open_modal_button"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Video info */}
            <div className="p-4 pb-2">
              <DialogHeader>
                <DialogTitle className="text-base font-bold leading-snug text-foreground">
                  {post.title}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <span className="text-xs text-primary font-medium">
                  @{creatorName}
                </span>
                {/* Creator online status dot */}
                <OnlineStatusDot lastActiveAt={creatorLastActive} size="sm" />
                <span className="text-xs text-muted-foreground">
                  · {formatRelativeTime(post.timestamp)}
                </span>
              </div>
              {post.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {post.description}
                </p>
              )}

              {/* Save to Playlist button */}
              <button
                type="button"
                onClick={() => setPlaylistSheetOpen(true)}
                className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary/80 rounded-2xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors w-full"
                data-ocid="home.video.save_playlist_button"
              >
                <BookmarkPlus className="w-4 h-4 text-primary" />
                Save to Playlist
              </button>
            </div>

            {/* Translated Title & Description panel */}
            <TranslatedTitlePanel
              videoId={videoIdStr}
              originalTitle={post.title}
              originalDescription={post.description}
              lang={lang}
              subtitleLang={subtitleLang}
            />

            {/* Divider */}
            <div className="h-px bg-border/20 mx-4 mb-1" />

            {/* Comment Section */}
            <CommentSection
              videoId={videoIdStr}
              videoTitle={post.title}
              creatorName={creatorName}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Player Settings Modal (rendered outside Dialog to avoid z-index issues) */}
      {open && (
        <PlayerSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          quality={quality}
          onQualityChange={setQuality}
          speed={speed}
          onSpeedChange={setSpeed}
          subtitleLang={subtitleLang}
          onSubtitleChange={(lang) => void handleSubtitleChange(lang)}
          audioOption={audioOption}
          onAudioChange={setAudioOption}
          isTranslating={isTranslating}
        />
      )}

      {/* Save to Playlist Sheet (outside Dialog to avoid nesting issues) */}
      {open && (
        <SaveToPlaylistSheet
          videoId={post.id}
          open={playlistSheetOpen}
          onClose={() => setPlaylistSheetOpen(false)}
        />
      )}
    </>
  );
}
