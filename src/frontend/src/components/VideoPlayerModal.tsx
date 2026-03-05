/**
 * VideoPlayerModal
 *
 * Full-width video at top of a bottom-sheet-style dialog.
 * Sections: Player → Title/Meta → Actions → Creator → Description → Comments → Suggested
 *
 * PiP (Picture-in-Picture):
 *   – When the user scrolls down past the video, the video shrinks into a
 *     small floating card in the bottom-right corner.
 *   – Tap the floating card to expand back to full view.
 *   – Swipe the floating card left/right to dismiss.
 *
 * Comments: sort Newest/Top, threaded replies (2 levels), like, reply,
 *           pinned comment, AI-suggest reply.
 */

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
  Bell,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Languages,
  ListVideo,
  Loader2,
  MessageCircle,
  Mic2,
  MonitorPlay,
  MoreHorizontal,
  MoreVertical,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Share2,
  Shuffle,
  Subtitles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoPost } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddVideoToPlaylist,
  useCreatePlaylist,
  useFollowCreator,
  useGetUsername,
  useGetUsernameByPrincipal,
  useIsFollowing,
  useListMyPlaylists,
  useListVideoPosts,
  useRecordVideoView,
  useRecordWatchHistory,
  useToggleVideoLike,
  useUnfollowCreator,
  useVideoEngagement,
} from "../hooks/useQueries";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/languages";
import { updateActiveStatus } from "../utils/activeStatus";
import { OnlineStatusDot } from "./OnlineStatusDot";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  likes: number;
  isAiSuggested?: boolean;
}

interface Comment {
  id: string;
  videoId: string;
  author: string;
  text: string;
  timestamp: number;
  likes: number;
  pinned?: boolean;
  replies: Reply[];
}

type QualityOption = "Auto" | "1080p" | "720p" | "480p" | "360p" | "240p";
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
  "240p",
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
const SUBTITLE_LINES: Record<string, string[]> = {
  en: [
    "Welcome to this video.",
    "Today we explore something amazing.",
    "Stay tuned for more content.",
    "This is a subtitle demo.",
    "Thanks for watching!",
  ],
  es: [
    "Bienvenido a este video.",
    "Hoy exploramos algo increíble.",
    "Mantente atento para más contenido.",
    "Esto es una demo de subtítulos.",
    "¡Gracias por ver!",
  ],
  fr: [
    "Bienvenue dans cette vidéo.",
    "Aujourd'hui nous explorons quelque chose d'incroyable.",
    "Restez à l'écoute.",
    "Démonstration de sous-titres.",
    "Merci de regarder!",
  ],
  ar: [
    "مرحباً بكم في هذا الفيديو.",
    "اليوم نستكشف شيئاً رائعاً.",
    "ابقوا معنا.",
    "هذا عرض توضيحي.",
    "شكراً على المشاهدة!",
  ],
  hi: [
    "इस वीडियो में आपका स्वागत है।",
    "आज हम कुछ अद्भुत खोजते हैं।",
    "बने रहें।",
    "यह उपशीर्षक प्रदर्शन है।",
    "धन्यवाद!",
  ],
};

// ─── localStorage helpers ──────────────────────────────────────────────────────

function loadComments(vid: string): Comment[] {
  try {
    return JSON.parse(localStorage.getItem(`cmt3-${vid}`) ?? "[]") as Comment[];
  } catch {
    return [];
  }
}
function saveComments(vid: string, c: Comment[]) {
  try {
    localStorage.setItem(`cmt3-${vid}`, JSON.stringify(c));
  } catch {
    /**/
  }
}
function dailyAiKey() {
  return `ai-d-${new Date().toISOString().slice(0, 10)}`;
}
function dailyAiUsage() {
  try {
    return Number(localStorage.getItem(dailyAiKey()) ?? 0);
  } catch {
    return 0;
  }
}
function bumpDailyAi() {
  try {
    localStorage.setItem(dailyAiKey(), (dailyAiUsage() + 1).toString());
  } catch {
    /**/
  }
}
function cmtAiUsage(id: string) {
  try {
    return Number(localStorage.getItem(`aiu-${id}`) ?? 0);
  } catch {
    return 0;
  }
}
function bumpCmtAi(id: string) {
  try {
    localStorage.setItem(`aiu-${id}`, (cmtAiUsage(id) + 1).toString());
  } catch {
    /**/
  }
}
function getGuestId(): string {
  try {
    let id = localStorage.getItem("guestId");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("guestId", id);
    }
    return id;
  } catch {
    return "guest";
  }
}
function getUserDisliked(vid: string) {
  try {
    return localStorage.getItem(`ud-${vid}`) === "1";
  } catch {
    return false;
  }
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtTime(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const d = Math.floor((Date.now() - ms) / 86400000);
  const h = Math.floor((Date.now() - ms) / 3600000);
  const m = Math.floor((Date.now() - ms) / 60000);
  if (d > 30)
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}
function fmtCmtTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  const h = Math.floor(m / 60);
  const dd = Math.floor(h / 24);
  if (dd > 0) return `${dd}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}
function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function getLangName(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

function aiReply(text: string, title: string, creator: string): string {
  const t = text.toLowerCase();
  if (text.includes("?"))
    return `Great question! 🙌 Thanks for watching "${title}". Feel free to ask more! — ${creator}`;
  if (/love|great|amazing|awesome|fire|goat/i.test(t))
    return `Thank you so much! 🙏❤️ Comments like yours keep me going. Subscribe so you don't miss the next one! — ${creator}`;
  if (/bad|hate|worst|boring|trash/i.test(t))
    return `Appreciate the honest feedback on "${title}" 🙏 I'll keep improving. Hope to win you over! — ${creator}`;
  if (text.trim().length < 20)
    return `Thanks for commenting on "${title}"! 🎬 Really means a lot. — ${creator}`;
  return `Thank you for your thoughtful comment on "${title}"! 🙌 Your engagement means the world. Stay tuned! — ${creator}`;
}

// ─── SubtitleOverlay ───────────────────────────────────────────────────────────

function SubtitleOverlay({
  lang: sl,
  translating,
  lines,
}: { lang: SubtitleLang; translating: boolean; lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    if (sl === "off" || lines.length === 0) return;
    setIdx(0);
    setVis(true);
    const iv = setInterval(() => {
      setVis(false);
      setTimeout(() => {
        setIdx((p) => (p + 1) % lines.length);
        setVis(true);
      }, 300);
    }, 4000);
    return () => clearInterval(iv);
  }, [sl, lines]);
  if (sl === "off") return null;
  return (
    <div className="absolute bottom-14 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
      <AnimatePresence>
        {translating ? (
          <motion.div
            key="tr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-black/70 rounded-xl px-3 py-1.5"
          >
            <Loader2 className="w-3 h-3 animate-spin text-white/80" />
            <span className="text-white/80 text-xs">Translating…</span>
          </motion.div>
        ) : lines.length > 0 && vis ? (
          <motion.div
            key={`s${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-black/65 rounded-lg px-3 py-1.5 max-w-[82%] text-center"
            style={{ direction: sl === "ar" ? "rtl" : "ltr" }}
          >
            <span className="text-white text-sm font-medium drop-shadow-sm">
              {lines[idx]}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── PlayerSettingsModal ───────────────────────────────────────────────────────

interface TempSettings {
  quality: QualityOption;
  speed: SpeedOption;
  subtitle: SubtitleLang;
  audio: AudioOption;
}

function PlayerSettingsModal({
  open,
  onClose,
  quality,
  speed,
  subtitle,
  audio,
  translating,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  quality: QualityOption;
  speed: SpeedOption;
  subtitle: SubtitleLang;
  audio: AudioOption;
  translating: boolean;
  onSave: (settings: TempSettings) => void;
}) {
  const [active, setActive] = useState<SettingsSection>(null);

  // Temporary state — initialised from active settings when modal opens.
  // Changes here do NOT affect the video until Save is tapped.
  const [temp, setTemp] = useState<TempSettings>({
    quality,
    speed,
    subtitle,
    audio,
  });

  // Sync temp state from parent every time the modal opens (or active settings change while closed).
  useEffect(() => {
    if (open) {
      setTemp({ quality, speed, subtitle, audio });
      setActive(null);
    }
  }, [open, quality, speed, subtitle, audio]);

  const subs = {
    quality: temp.quality,
    speed: temp.speed === 1 ? "Normal" : `${temp.speed}×`,
    subtitles:
      temp.subtitle === "off"
        ? "OFF"
        : temp.subtitle === "auto"
          ? "Auto"
          : (SUBTITLE_OPTIONS.find((s) => s.value === temp.subtitle)?.label ??
            temp.subtitle),
    audio: temp.audio === "original" ? "Original" : "Dubbed",
  };
  const icons = {
    quality: <MonitorPlay className="w-4 h-4" />,
    speed: <Zap className="w-4 h-4" />,
    subtitles: <Subtitles className="w-4 h-4" />,
    audio: <Mic2 className="w-4 h-4" />,
  };
  const labels = {
    quality: "Quality",
    speed: "Playback Speed",
    subtitles: "Subtitles",
    audio: "Audio Language",
  };
  const sections = (
    ["quality", "speed", "subtitles", "audio"] as SettingsSection[]
  ).filter(Boolean) as NonNullable<SettingsSection>[];

  const handleCancel = () => {
    // Discard temp changes — just close, parent state is untouched.
    onClose();
  };

  const handleSave = () => {
    onSave(temp);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={handleCancel}
          />
          <motion.div
            key="m"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-lg"
            data-ocid="player.settings.modal"
          >
            <div className="bg-[#1a1a1a] border border-white/10 rounded-t-3xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="text-sm font-bold text-white/90 uppercase tracking-widest">
                  Player Settings
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
                  data-ocid="player.settings.close_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-px bg-white/10 mx-5" />
              <div className="py-3">
                {sections.map((k) => (
                  <div key={k}>
                    <button
                      type="button"
                      onClick={() => setActive(active === k ? null : k)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white/50">{icons[k]}</span>
                      <span className="flex-1 text-sm font-medium text-white/90 text-left">
                        {labels[k]}
                      </span>
                      <span className="text-xs text-[#FF2D2D] font-semibold mr-2">
                        {subs[k]}
                        {k === "subtitles" && translating && (
                          <Loader2 className="inline w-3 h-3 animate-spin ml-1" />
                        )}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-white/30 transition-transform duration-200 ${active === k ? "rotate-90" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {active === k && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-black/30"
                        >
                          <div className="px-5 py-2 space-y-1">
                            {k === "quality" &&
                              QUALITY_OPTIONS.map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  onClick={() => {
                                    setTemp((p) => ({ ...p, quality: q }));
                                    setActive(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                  {temp.quality === q ? (
                                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm ${temp.quality === q ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                  >
                                    {q}
                                  </span>
                                </button>
                              ))}
                            {k === "speed" &&
                              SPEED_OPTIONS.map(({ value, label }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setTemp((p) => ({ ...p, speed: value }));
                                    setActive(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                  {temp.speed === value ? (
                                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm ${temp.speed === value ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                  >
                                    {label}
                                  </span>
                                </button>
                              ))}
                            {k === "subtitles" &&
                              SUBTITLE_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  onClick={() => {
                                    setTemp((p) => ({
                                      ...p,
                                      subtitle: o.value,
                                    }));
                                    setActive(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                  {temp.subtitle === o.value ? (
                                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm flex-1 text-left ${temp.subtitle === o.value ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                  >
                                    {o.label}
                                  </span>
                                  {o.value !== "off" && o.value !== "auto" && (
                                    <span className="text-xs text-white/30">
                                      {o.langName}
                                    </span>
                                  )}
                                  {o.value === "auto" && (
                                    <span className="text-[10px] bg-[#FF2D2D]/20 text-[#FF2D2D] rounded-full px-2 py-0.5 font-semibold">
                                      AI
                                    </span>
                                  )}
                                </button>
                              ))}
                            {k === "audio" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTemp((p) => ({
                                      ...p,
                                      audio: "original",
                                    }));
                                    setActive(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                  {temp.audio === "original" ? (
                                    <Check className="w-4 h-4 text-[#FF2D2D] shrink-0" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm flex-1 text-left ${temp.audio === "original" ? "text-[#FF2D2D] font-semibold" : "text-white/70"}`}
                                  >
                                    Original
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed"
                                >
                                  <span className="w-4 h-4 shrink-0" />
                                  <span className="text-sm text-white/40 flex-1 text-left">
                                    Dubbed
                                  </span>
                                  <span className="text-[10px] bg-white/10 text-white/40 rounded-full px-2 py-0.5">
                                    Coming Soon
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* ── Save / Cancel action row ───────────────────────────── */}
              <div className="h-px bg-white/10 mx-5" />
              <div className="flex gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-sm font-semibold transition-colors active:scale-[0.97]"
                  data-ocid="player_settings.cancel_button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 h-11 rounded-2xl bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 text-white text-sm font-bold transition-colors active:scale-[0.97] shadow-[0_0_16px_rgba(255,45,45,0.35)]"
                  data-ocid="player_settings.save_button"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── SaveToPlaylistSheet ───────────────────────────────────────────────────────

function SaveToPlaylistSheet({
  videoId,
  open,
  onClose,
}: { videoId: bigint; open: boolean; onClose: () => void }) {
  const { data: playlists, isLoading } = useListMyPlaylists();
  const addVideo = useAddVideoToPlaylist();
  const createPl = useCreatePlaylist();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) {
      setAdded(new Set());
      setCreating(false);
      setNewName("");
    }
  }, [open]);
  useEffect(() => {
    if (creating) setTimeout(() => ref.current?.focus(), 80);
  }, [creating]);
  const doAdd = async (id: bigint, name: string) => {
    try {
      await addVideo.mutateAsync({ playlistId: id, videoId });
      setAdded((p) => new Set([...p, id.toString()]));
      toast.success(`Added to "${name}"`);
    } catch {
      toast.error("Failed");
    }
  };
  const doCreate = async () => {
    if (!newName.trim()) {
      toast.error("Enter a name");
      return;
    }
    try {
      const id = await createPl.mutateAsync(newName.trim());
      await addVideo.mutateAsync({ playlistId: id, videoId });
      setAdded((p) => new Set([...p, id.toString()]));
      toast.success(`Created "${newName.trim()}"`);
      setCreating(false);
      setNewName("");
    } catch {
      toast.error("Failed");
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
            <SheetTitle className="text-base font-bold">
              Save to Playlist
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="home.video.playlist.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>
        <div className="h-px bg-border/20 mx-5" />
        <ScrollArea className="max-h-[45vh]">
          <div className="px-5 py-3 space-y-2">
            {creating ? (
              <div className="flex items-center gap-2 bg-secondary/40 rounded-2xl p-3">
                <Input
                  ref={ref}
                  placeholder="Playlist name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void doCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  className="h-9 flex-1 bg-secondary/60 border-border/40 text-sm rounded-xl"
                  data-ocid="home.video.playlist.input"
                />
                <button
                  type="button"
                  onClick={() => void doCreate()}
                  disabled={createPl.isPending}
                  className="h-9 px-3 bg-primary text-white text-xs font-bold rounded-xl"
                  data-ocid="home.video.playlist.submit_button"
                >
                  {createPl.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="h-9 px-2 text-muted-foreground text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
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
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !playlists?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No playlists yet
              </div>
            ) : (
              playlists.map((pl, i) => {
                const isAdded = added.has(pl.id.toString());
                return (
                  <div
                    key={pl.id.toString()}
                    className="flex items-center gap-3 bg-secondary/40 rounded-2xl px-4 py-3"
                    data-ocid={`home.video.playlist.item.${i + 1}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <ListVideo className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {pl.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pl.videoIds.length} videos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isAdded && void doAdd(pl.id, pl.name)}
                      disabled={isAdded || addVideo.isPending}
                      className={`h-8 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${isAdded ? "bg-green-500/20 text-green-400" : "bg-primary/20 hover:bg-primary/30 text-primary"}`}
                      data-ocid={`home.video.playlist.save_button.${i + 1}`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
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

// ─── ShareSheet ────────────────────────────────────────────────────────────────

function ShareSheet({
  open,
  onClose,
  title,
}: { open: boolean; onClose: () => void; title: string }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-border/30 rounded-t-3xl p-0"
        data-ocid="player.share.sheet"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold">Share</SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
              data-ocid="player.share.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>
        <div className="h-px bg-border/20 mx-5" />
        <div className="px-5 py-4 space-y-2 pb-8">
          <p className="text-xs text-muted-foreground truncate mb-2">
            "{title}"
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(window.location.href)
                .then(() => toast.success("Link copied!"))
                .catch(() => toast.info("Copy the URL to share"));
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-secondary/40 hover:bg-secondary/60 rounded-2xl px-4 py-3 transition-colors"
            data-ocid="player.share.copy_button"
          >
            <Copy className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Copy Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              toast.info("Remix coming soon!");
              onClose();
            }}
            className="w-full flex items-center gap-3 bg-secondary/40 hover:bg-secondary/60 rounded-2xl px-4 py-3 transition-colors"
            data-ocid="player.share.remix_button"
          >
            <Shuffle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Remix</span>
            <span className="ml-auto text-[10px] bg-primary/15 text-primary rounded-full px-2 py-0.5 font-semibold">
              Soon
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── AiReplyBox ────────────────────────────────────────────────────────────────

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
  onPost: (t: string) => void;
  onDiscard: () => void;
}) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [cnt, setCnt] = useState(() => cmtAiUsage(comment.id));
  const MAX = 5;

  const fetch = async () => {
    if (cnt >= MAX) {
      toast.error("Limit reached (max 5)");
      return;
    }
    if (dailyAiUsage() >= 20) {
      toast.error("Daily limit reached");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSuggestion(aiReply(comment.text, videoTitle, creatorName));
    bumpCmtAi(comment.id);
    bumpDailyAi();
    setCnt((c) => c + 1);
    setLoading(false);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount
  useEffect(() => {
    void fetch();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-2 rounded-2xl bg-secondary/30 border border-primary/20 p-3 space-y-2"
      data-ocid="comments.ai_reply.panel"
    >
      <div className="flex items-center gap-2">
        <Wand2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">AI Suggestion</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {cnt}/{MAX}
        </span>
      </div>
      {loading ? (
        <div
          className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-xs"
          data-ocid="comments.ai_reply.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Generating…
        </div>
      ) : (
        <Textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          rows={3}
          className="w-full bg-secondary/60 border-border/30 text-xs rounded-xl resize-none"
          placeholder="AI reply…"
          data-ocid="comments.ai_reply.textarea"
        />
      )}
      {!loading && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => onPost(suggestion)}
            disabled={!suggestion.trim()}
            className="h-8 px-3 rounded-xl bg-primary text-white text-xs flex-1"
            data-ocid="comments.ai_reply.submit_button"
          >
            Post Reply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void fetch()}
            disabled={cnt >= MAX}
            className="h-8 px-3 rounded-xl text-xs"
            data-ocid="comments.ai_reply.secondary_button"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Redo
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

// ─── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  videoTitle,
  creatorName,
  currentUser,
  onReplyPosted,
  onDeleteComment,
  onTogglePin,
}: {
  comment: Comment;
  videoTitle: string;
  creatorName: string;
  currentUser: string;
  onReplyPosted: (id: string, r: Reply) => void;
  onDeleteComment: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes ?? 0);
  const [showMenu, setShowMenu] = useState(false);
  const canAi = cmtAiUsage(comment.id) < 5 && dailyAiUsage() < 20;

  const postReply = () => {
    if (!replyText.trim()) return;
    onReplyPosted(comment.id, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: currentUser,
      text: replyText.trim(),
      timestamp: Date.now(),
      likes: 0,
    });
    setReplyText("");
    setShowReplyInput(false);
    setShowReplies(true);
  };
  const aiPost = (t: string) => {
    if (!t.trim()) return;
    onReplyPosted(comment.id, {
      id: `${Date.now()}-ai-${Math.random().toString(36).slice(2, 7)}`,
      author: currentUser,
      text: t.trim(),
      timestamp: Date.now(),
      likes: 0,
      isAiSuggested: true,
    });
    setShowAi(false);
    setShowReplies(true);
  };

  return (
    <div className="space-y-1.5">
      {comment.pinned && (
        <div className="flex items-center gap-1.5 text-[10px] text-primary font-semibold mb-1">
          <Pin className="w-3 h-3" />
          Pinned comment
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
          {comment.author.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold truncate">
              @{comment.author}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {fmtCmtTime(comment.timestamp)}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed break-words">
            {comment.text}
          </p>
          {/* Action row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setLiked((p) => !p);
                setLikes((p) => (liked ? p - 1 : p + 1));
              }}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {likes > 0 && <span>{likes}</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReplyInput((p) => !p);
                setShowAi(false);
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
                if (!canAi) {
                  toast.error("AI limit reached", { id: "ai" });
                  return;
                }
                setShowAi((p) => !p);
                setShowReplyInput(false);
              }}
              disabled={!canAi && !showAi}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${canAi ? "text-primary hover:text-primary/80" : "text-muted-foreground/40 cursor-not-allowed"}`}
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
            {/* More menu (pin/delete) */}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowMenu((p) => !p)}
                className="flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/40 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-7 z-50 bg-card border border-border/40 rounded-2xl shadow-xl overflow-hidden w-40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePin(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-secondary/40 transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5 text-primary" />
                      {comment.pinned ? "Unpin" : "Pin"}
                    </button>
                    {comment.author === currentUser && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteComment(comment.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        data-ocid="comments.comment.delete_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Reply input */}
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
                if (e.key === "Enter" && !e.shiftKey) postReply();
              }}
              placeholder="Write a reply…"
              className="flex-1 h-9 bg-secondary/50 border-border/30 text-xs rounded-xl"
              data-ocid="comments.reply.input"
            />
            <button
              type="button"
              onClick={postReply}
              disabled={!replyText.trim()}
              className="h-9 w-9 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors disabled:opacity-40"
              data-ocid="comments.reply.submit_button"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI box */}
      <AnimatePresence>
        {showAi && (
          <div className="ml-11">
            <AiReplyBox
              comment={comment}
              videoTitle={videoTitle}
              creatorName={creatorName}
              onPost={aiPost}
              onDiscard={() => setShowAi(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Replies (level 2) */}
      <AnimatePresence>
        {showReplies && comment.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-11 space-y-2 overflow-hidden"
          >
            {comment.replies.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2 bg-secondary/15 rounded-xl p-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-[10px] text-primary">
                  {r.author.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold truncate">
                      @{r.author}
                    </span>
                    {r.isAiSuggested && (
                      <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
                        <Wand2 className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {fmtCmtTime(r.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed break-words">
                    {r.text}
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

// ─── SuggestedCard ─────────────────────────────────────────────────────────────

function SuggestedCard({
  post,
  onClick,
}: { post: VideoPost; onClick: () => void }) {
  const { data: creator } = useGetUsernameByPrincipal(post.uploader);
  const { data: eng } = useVideoEngagement(post.id.toString(), undefined);
  const views = eng?.views ?? 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 w-full text-left hover:bg-secondary/30 active:bg-secondary/50 rounded-2xl p-2 transition-colors group"
      data-ocid="player.suggested.button"
    >
      <div className="relative w-28 h-[62px] rounded-xl overflow-hidden bg-secondary/50 shrink-0">
        <img
          src={post.thumbnailBlob.getDirectURL()}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1">
          {post.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          @{creator ?? "unknown"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {fmtN(views)} views · {fmtTime(post.timestamp)}
        </p>
      </div>
    </button>
  );
}

// ─── PiP (Picture-in-Picture) floating player ──────────────────────────────────

function PipPlayer({
  videoRef,
  title,
  onExpand,
  onDismiss,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title: string;
  onExpand: () => void;
  onDismiss: () => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, 0, 120], [0, 1, 0]);
  const rotate = useTransform(x, [-120, 0, 120], [-8, 0, 8]);

  return (
    <motion.div
      style={{ x, opacity, rotate }}
      drag="x"
      dragConstraints={{ left: -20, right: 20 }}
      dragElastic={0.4}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 80) onDismiss();
        else x.set(0);
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 20 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-24 right-3 z-[80] w-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 cursor-grab active:cursor-grabbing"
      data-ocid="player.pip.panel"
    >
      {/* Mini video */}
      <div className="relative bg-black aspect-video">
        {/* Mirror the src; the original video element stays in the DOM */}
        <video
          src={videoRef.current?.src}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={videoRef.current?.muted ?? false}
        />
        {/* Expand tap target */}
        <button
          type="button"
          aria-label="Expand player"
          onClick={onExpand}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onExpand();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
          data-ocid="player.pip.expand_button"
        >
          <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
            <ChevronUp className="w-4 h-4 text-white" />
          </div>
        </button>
        {/* Dismiss X */}
        <button
          type="button"
          aria-label="Close mini player"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onDismiss();
            }
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          data-ocid="player.pip.close_button"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {/* Title strip */}
      <div className="bg-[#111] px-2 py-1.5">
        <p className="text-[10px] text-white/80 font-medium leading-snug line-clamp-1">
          {title}
        </p>
      </div>
    </motion.div>
  );
}

// ─── VideoPlayerModal ──────────────────────────────────────────────────────────

interface VideoPlayerModalProps {
  post: VideoPost | null;
  open: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({
  post,
  open,
  onClose,
}: VideoPlayerModalProps) {
  const { data: creatorUsername } = useGetUsernameByPrincipal(post?.uploader);
  const { data: currentUsername } = useGetUsername();
  const { identity } = useInternetIdentity();
  const { lang } = useLanguage();
  const recordWatchHistory = useRecordWatchHistory();
  const recordVideoView = useRecordVideoView();
  const toggleVideoLike = useToggleVideoLike();
  const { data: allVideos } = useListVideoPosts();
  const followCreator = useFollowCreator();
  const unfollowCreator = useUnfollowCreator();
  const { data: isFollowing } = useIsFollowing(post?.uploader);

  // Player refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);

  // Player settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quality, setQuality] = useState<QualityOption>("Auto");
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [subtitle, setSubtitle] = useState<SubtitleLang>("off");
  const [audio, setAudio] = useState<AudioOption>("original");
  const [translating, setTranslating] = useState(false);
  const [subtitleLines, setSubtitleLines] = useState<string[]>([]);

  // PiP state
  const [pipActive, setPipActive] = useState(false);

  // Up Next preview card (last 5s + after video ends)
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState(5);
  const [upNextCancelled, setUpNextCancelled] = useState(false);
  const upNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Actions
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Per-video derived
  const videoIdStr = post?.id.toString() ?? "";
  const creatorName = creatorUsername ?? "unknown";
  const currentUser = currentUsername ?? "User";

  // Stable userId (principal or guestId fallback)
  const userId = useMemo(
    () => identity?.getPrincipal().toString() ?? getGuestId(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity],
  );

  // Engagement data — fetched in background, never blocks render
  const { data: engagementData } = useVideoEngagement(
    post ? videoIdStr : undefined,
    userId,
  );
  const views = engagementData?.views ?? 0;
  const likeCount = engagementData?.likes ?? 0;
  const liked = engagementData?.userLiked ?? false;

  // Dislike is UI-only (not synced)
  const [disliked, setDisliked] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSort, setCommentSort] = useState<"top" | "newest">("newest");

  // Suggested
  const suggested = useMemo(
    () =>
      allVideos && post
        ? allVideos.filter((v) => v.id !== post.id).slice(0, 8)
        : [],
    [allVideos, post],
  );

  // Creator online status
  const creatorLastActive = useMemo(() => {
    const s = post?.uploader?.toString() ?? "";
    if (!s) return null;
    try {
      const r = localStorage.getItem(`last-active-${s}`);
      return r ? Number(r) : null;
    } catch {
      return null;
    }
  }, [post?.uploader]);

  // Stable refs so the reset effect doesn't re-run on every render
  const mutateRef = useRef(recordWatchHistory.mutate);
  mutateRef.current = recordWatchHistory.mutate;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // ── swipe-down-to-close ───────────────────────────────────────────────────
  // Declared here so it's available in the reset effect below
  const dragY = useMotionValue(0);
  const bgOpacity = useTransform(dragY, [0, 200], [1, 0.5]);
  const scale = useTransform(dragY, [0, 200], [1, 0.95]);

  const handleSwipeDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      } else {
        dragY.set(0);
      }
    },
    [onClose, dragY],
  );

  // ── reset on open/video change ────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: dragY is a stable MotionValue ref; changeSubtitle dep omitted to avoid re-run loop
  useEffect(() => {
    if (!open || !post) return;
    const vid = post.id.toString();
    const uid = identityRef.current?.getPrincipal().toString() ?? getGuestId();
    // Load dislike status (UI-only, kept in its own key)
    setDisliked(getUserDisliked(vid));
    setComments(loadComments(vid));
    setNewComment("");
    setDescExpanded(false);
    setShowUpNext(false);
    setUpNextCountdown(5);
    setUpNextCancelled(false);
    setPipActive(false);
    dragY.set(0);
    mutateRef.current(post.id);
    if (uid && uid !== "guest") updateActiveStatus(uid);

    // Restore persisted player preferences from localStorage
    try {
      const savedQuality = localStorage.getItem(
        "player_quality",
      ) as QualityOption | null;
      const savedSpeed = localStorage.getItem("player_speed");
      const savedSubtitle = localStorage.getItem(
        "player_subtitle",
      ) as SubtitleLang | null;
      const savedAudio = localStorage.getItem(
        "player_audio",
      ) as AudioOption | null;
      if (savedQuality && QUALITY_OPTIONS.includes(savedQuality)) {
        setQuality(savedQuality);
      }
      if (savedSpeed) {
        const s = Number(savedSpeed) as SpeedOption;
        if (([0.5, 0.75, 1, 1.25, 1.5, 2] as number[]).includes(s)) {
          setSpeed(s);
        }
      }
      if (savedSubtitle) {
        const validSubs: SubtitleLang[] = [
          "off",
          "en",
          "es",
          "fr",
          "ar",
          "hi",
          "auto",
        ];
        if (validSubs.includes(savedSubtitle)) {
          // Schedule subtitle change after mount so changeSubtitle ref is ready
          setTimeout(() => void changeSubtitleRef.current(savedSubtitle), 0);
        }
      }
      if (savedAudio === "original" || savedAudio === "dubbed") {
        setAudio(savedAudio);
      }
    } catch {
      /**/
    }
  }, [open, post]);

  // ── deferred view increment (non-blocking, 300ms after open) ─────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs on open/post change
  useEffect(() => {
    if (!open || !post) return;
    const uid = identityRef.current?.getPrincipal().toString() ?? getGuestId();
    const timer = setTimeout(() => {
      recordVideoView.mutate({ videoId: post.id.toString(), userId: uid });
    }, 300);
    return () => clearTimeout(timer);
    // recordVideoView is stable (useMutation); post.id and open are the intended deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  // ── Up Next countdown when visible ───────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: upNextCancelled is checked inside but we intentionally only re-run when showUpNext toggles
  useEffect(() => {
    if (!showUpNext || upNextCancelled) return;
    // Reset countdown
    setUpNextCountdown(5);
    if (upNextTimerRef.current) clearInterval(upNextTimerRef.current);
    upNextTimerRef.current = setInterval(() => {
      setUpNextCountdown((prev) => {
        if (prev <= 1) {
          if (upNextTimerRef.current) clearInterval(upNextTimerRef.current);
          // Auto-dismiss the card when countdown hits 0
          setShowUpNext(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (upNextTimerRef.current) clearInterval(upNextTimerRef.current);
    };
  }, [showUpNext]);

  // ── subtitle auto-detect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const sl = SUPPORTED_SUBTITLE_LANGS.includes(lang as SubtitleLang)
      ? (lang as SubtitleLang)
      : "off";
    setSubtitle(sl);
    if (sl !== "off") void changeSubtitle(sl);
  }, [open, lang]);

  // ── playback speed ────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // ── apply player settings (called by Save button) ─────────────────────
  // ── scroll → PiP ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    const wrap = videoWrapRef.current;
    if (!el || !wrap) return;
    const onScroll = () => {
      const wrapBottom = wrap.getBoundingClientRect().bottom;
      setPipActive(wrapBottom < 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // scrollRef and videoWrapRef are stable refs — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeSubtitle = useCallback(
    async (sl: SubtitleLang) => {
      setSubtitle(sl);
      if (sl === "off") {
        setSubtitleLines([]);
        return;
      }
      const vid = post?.id.toString() ?? "";
      const title = post?.title ?? "";
      if (sl === "auto") {
        const key = `sub-auto-${vid}`;
        try {
          const c = localStorage.getItem(key);
          if (c) {
            setSubtitleLines(JSON.parse(c) as string[]);
            return;
          }
        } catch {
          /**/
        }
        setTranslating(true);
        await new Promise((r) => setTimeout(r, 1500));
        const lines = SUBTITLE_LINES.en.map((l) => `[Auto] ${l}`);
        try {
          localStorage.setItem(key, JSON.stringify(lines));
        } catch {
          /**/
        }
        setSubtitleLines(lines);
        setTranslating(false);
        return;
      }
      const key = `sub-${title}-${sl}`;
      try {
        const c = localStorage.getItem(key);
        if (c) {
          setSubtitleLines(JSON.parse(c) as string[]);
          return;
        }
      } catch {
        /**/
      }
      const lines = SUBTITLE_LINES[sl] ?? SUBTITLE_LINES.en;
      if (!SUBTITLE_LINES[sl]) {
        setTranslating(true);
        await new Promise((r) => setTimeout(r, 1200));
        setTranslating(false);
      }
      try {
        localStorage.setItem(key, JSON.stringify(lines));
      } catch {
        /**/
      }
      setSubtitleLines(lines);
    },
    [post],
  );

  // Stable ref so the reset effect can call changeSubtitle without adding it as a dep
  const changeSubtitleRef = useRef(changeSubtitle);
  changeSubtitleRef.current = changeSubtitle;

  // ── apply player settings (called by Save button) ─────────────────────
  const applyPlayerSettings = useCallback(
    (saved: {
      quality: QualityOption;
      speed: SpeedOption;
      subtitle: SubtitleLang;
      audio: AudioOption;
    }) => {
      const v = videoRef.current;

      // 1. Playback speed — apply immediately, no reload needed
      setSpeed(saved.speed);
      if (v) v.playbackRate = saved.speed;

      // 2. Quality — if changed, update label; preserve timestamp + playback state
      if (saved.quality !== quality) {
        setQuality(saved.quality);
        if (v) {
          const ts = v.currentTime;
          const wasPlaying = !v.paused;
          // When a quality-specific URL is available, update v.src here first.
          v.currentTime = ts;
          if (wasPlaying) void v.play();
        }
      }

      // 3. Subtitles — apply via changeSubtitle helper
      if (saved.subtitle !== subtitle) {
        void changeSubtitleRef.current(saved.subtitle);
      }

      // 4. Audio language (future: swap audio track here)
      if (saved.audio !== audio) {
        setAudio(saved.audio);
      }

      // 5. Persist preferences to localStorage
      try {
        localStorage.setItem("player_quality", saved.quality);
        localStorage.setItem("player_speed", String(saved.speed));
        localStorage.setItem("player_subtitle", saved.subtitle);
        localStorage.setItem("player_audio", saved.audio);
      } catch {
        /**/
      }
    },
    [quality, subtitle, audio],
  );

  // ── video end ─────────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || v.duration === 0) return;
    const remaining = v.duration - v.currentTime;
    if (remaining <= 5 && !upNextCancelled) {
      setShowUpNext(true);
    }
  };

  // ── like / dislike ────────────────────────────────────────────────────────
  const handleLike = () => {
    if (!post || !userId) return;
    // If currently disliked, remove dislike first
    if (!liked && disliked) setDisliked(false);
    toggleVideoLike.mutate({ videoId: post.id.toString(), userId });
  };

  const handleDislike = () => {
    const vid = post?.id.toString() ?? "";
    if (!disliked) {
      setDisliked(true);
      // Un-like via the engagement store if currently liked
      if (liked && post && userId) {
        toggleVideoLike.mutate({ videoId: post.id.toString(), userId });
      }
      try {
        localStorage.setItem(`ud-${vid}`, "1");
      } catch {
        /**/
      }
    } else {
      setDisliked(false);
      try {
        localStorage.removeItem(`ud-${vid}`);
      } catch {
        /**/
      }
    }
  };

  // ── subscribe ─────────────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!post) return;
    try {
      if (isFollowing) {
        await unfollowCreator.mutateAsync(post.uploader);
        toast.success(`Unfollowed @${creatorName}`);
      } else {
        await followCreator.mutateAsync(post.uploader);
        toast.success(`Subscribed to @${creatorName}!`);
      }
    } catch {
      toast.error("Action failed");
    }
  };

  // ── comments ──────────────────────────────────────────────────────────────
  const persist = (c: Comment[]) => {
    setComments(c);
    saveComments(videoIdStr, c);
  };
  const addComment = () => {
    if (!newComment.trim()) return;
    persist([
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        videoId: videoIdStr,
        author: currentUser,
        text: newComment.trim(),
        timestamp: Date.now(),
        likes: 0,
        replies: [],
      },
      ...comments,
    ]);
    setNewComment("");
  };
  const onReply = (cid: string, r: Reply) =>
    persist(
      comments.map((c) =>
        c.id === cid ? { ...c, replies: [...c.replies, r] } : c,
      ),
    );
  const onDelete = (cid: string) =>
    persist(comments.filter((c) => c.id !== cid));
  const onPin = (cid: string) =>
    persist(
      comments.map((c) => (c.id === cid ? { ...c, pinned: !c.pinned } : c)),
    );

  const sortedComments = useMemo(() => {
    const pinned = comments.filter((c) => c.pinned);
    const rest = comments.filter((c) => !c.pinned);
    const sorted =
      commentSort === "top"
        ? [...rest].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
        : [...rest].sort((a, b) => b.timestamp - a.timestamp);
    return [...pinned, ...sorted];
  }, [comments, commentSort]);

  if (!post) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="bg-card border-border/50 p-0 max-w-lg w-full rounded-3xl overflow-hidden"
          data-ocid="home.video.modal"
          style={{ overflow: "visible" }}
        >
          {/* Animated wrapper — provides the drag transform */}
          <motion.div
            style={{ y: dragY, opacity: bgOpacity, scale }}
            className="rounded-3xl overflow-hidden bg-card"
          >
            {/* Drag handle */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDrag={(_, info) => {
                if (info.offset.y > 0) dragY.set(info.offset.y);
              }}
              onDragEnd={handleSwipeDragEnd}
              className="flex justify-center items-center h-7 cursor-grab active:cursor-grabbing touch-none z-50 bg-card"
              data-ocid="player.swipe_handle.drag_handle"
              aria-label="Swipe down to close"
            >
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </motion.div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-50 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
              data-ocid="home.video.close_button"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Scrollable body */}
            <div
              ref={scrollRef}
              className="max-h-[92vh] overflow-y-auto scrollbar-hide"
            >
              {/* ── 1. VIDEO PLAYER (full width) ──────────────────────── */}
              <div
                ref={videoWrapRef}
                className="relative bg-black w-full aspect-video"
              >
                {/* biome-ignore lint/a11y/useMediaCaption: user-generated content; custom subtitle overlay */}
                <video
                  ref={videoRef}
                  src={post.videoBlob.getDirectURL()}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => {
                    if (!upNextCancelled) setShowUpNext(true);
                  }}
                />
                <SubtitleOverlay
                  lang={subtitle}
                  translating={translating}
                  lines={subtitleLines}
                />
                {/* Settings gear — always visible, never blocked */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="absolute bottom-3 right-3 z-30 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90"
                  aria-label="Player settings"
                  data-ocid="player.settings.open_modal_button"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {/* Small Up Next preview card — bottom only, never darkens screen */}
                <AnimatePresence>
                  {showUpNext && suggested[0] && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute bottom-12 left-3 right-12 z-20 pointer-events-auto"
                      data-ocid="player.up_next.panel"
                    >
                      <div className="flex items-center gap-2.5 bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2.5">
                        {/* Thumbnail */}
                        <div className="w-14 h-9 rounded-lg overflow-hidden bg-white/10 shrink-0">
                          <img
                            src={suggested[0].thumbnailBlob.getDirectURL()}
                            alt={suggested[0].title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider leading-none mb-0.5">
                            Up Next · {upNextCountdown}s
                          </p>
                          <p className="text-white text-xs font-semibold line-clamp-1">
                            {suggested[0].title}
                          </p>
                        </div>
                        {/* Cancel */}
                        <button
                          type="button"
                          onClick={() => {
                            setUpNextCancelled(true);
                            setShowUpNext(false);
                            if (upNextTimerRef.current)
                              clearInterval(upNextTimerRef.current);
                          }}
                          className="shrink-0 h-7 px-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white/80 text-xs font-semibold transition-colors"
                          data-ocid="player.up_next.cancel_button"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── 2. TITLE & META ──────────────────────────────────── */}
              <div className="px-4 pt-3 pb-1">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold leading-snug text-foreground text-left">
                    {post.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{fmtN(views)} views</span>
                  <span>·</span>
                  <span>{fmtTime(post.timestamp)}</span>
                </div>
              </div>

              {/* ── 3. ACTIONS ROW ───────────────────────────────────── */}
              <div
                className="px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide"
                data-ocid="player.actions.panel"
              >
                {/* Like / Dislike pill */}
                <div className="flex items-center bg-secondary/60 rounded-full shrink-0">
                  <button
                    type="button"
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-l-full text-sm font-semibold transition-colors ${liked ? "text-primary bg-primary/10" : "text-foreground hover:bg-secondary"}`}
                    data-ocid="player.like.button"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{fmtN(likeCount)}</span>
                  </button>
                  <div className="w-px h-4 bg-border/40" />
                  <button
                    type="button"
                    onClick={handleDislike}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-r-full text-sm font-semibold transition-colors ${disliked ? "text-red-400 bg-red-500/10" : "text-foreground hover:bg-secondary"}`}
                    data-ocid="player.dislike.button"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                {/* Comments count */}
                <button
                  type="button"
                  onClick={() => {
                    const el = scrollRef.current;
                    if (el) el.scrollBy({ top: 400, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-3.5 py-2 rounded-full text-sm font-semibold text-foreground transition-colors shrink-0"
                  data-ocid="player.comments.button"
                >
                  <MessageCircle className="w-4 h-4" />
                  {comments.length > 0 ? fmtN(comments.length) : "Comment"}
                </button>
                {/* Share */}
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-3.5 py-2 rounded-full text-sm font-semibold text-foreground transition-colors shrink-0"
                  data-ocid="player.share.button"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                {/* Remix */}
                <button
                  type="button"
                  onClick={() => toast.info("Remix coming soon!")}
                  className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-3.5 py-2 rounded-full text-sm font-semibold text-foreground transition-colors shrink-0"
                  data-ocid="player.remix.button"
                >
                  <Shuffle className="w-4 h-4" />
                  Remix
                </button>
                {/* Save */}
                <button
                  type="button"
                  onClick={() => setPlaylistOpen(true)}
                  className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-3.5 py-2 rounded-full text-sm font-semibold text-foreground transition-colors shrink-0"
                  data-ocid="player.save_playlist.button"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save
                </button>
                {/* Download */}
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Download available for premium subscribers")
                  }
                  className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-3.5 py-2 rounded-full text-sm font-semibold text-foreground transition-colors shrink-0"
                  data-ocid="player.download.button"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {/* More */}
                <button
                  type="button"
                  onClick={() => toast.info("More options coming soon")}
                  className="flex items-center justify-center bg-secondary/60 hover:bg-secondary w-9 h-9 rounded-full text-foreground transition-colors shrink-0"
                  data-ocid="player.more.button"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="h-px bg-border/15 mx-4" />

              {/* ── 4. CREATOR SECTION ───────────────────────────────── */}
              <div
                className="px-4 py-3 flex items-center gap-3"
                data-ocid="player.creator.panel"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-sm text-primary">
                  {creatorName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">@{creatorName}</p>
                    <OnlineStatusDot
                      lastActiveAt={creatorLastActive}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Creator</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSubscribe()}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${isFollowing ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-[#FF2D2D] hover:bg-[#FF2D2D]/90 text-white"}`}
                  data-ocid="player.subscribe.button"
                >
                  {isFollowing ? "Subscribed" : "Subscribe"}
                </button>
              </div>

              <div className="h-px bg-border/15 mx-4" />

              {/* ── 5. DESCRIPTION ───────────────────────────────────── */}
              {post.description && (
                <div className="px-4 py-3" data-ocid="player.description.panel">
                  <p
                    className={`text-sm text-muted-foreground leading-relaxed ${descExpanded ? "" : "line-clamp-2"}`}
                  >
                    {post.description}
                  </p>
                  {post.description.length > 100 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((p) => !p)}
                      className="text-xs font-semibold text-foreground mt-1.5 hover:text-primary transition-colors"
                      data-ocid="player.description.toggle"
                    >
                      {descExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}

              {/* Translated title panel */}
              {lang !== "en" && subtitle !== "off" && (
                <div
                  className="mx-4 mb-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-2xl"
                  data-ocid="player.translated_title.panel"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                      {getLangName(lang)} Translation
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">
                    [{getLangName(lang)}] {post.title}
                  </p>
                </div>
              )}

              <div className="h-px bg-border/15 mx-4" />

              {/* ── 6. COMMENTS ──────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-3" data-ocid="player.comments.panel">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Comments</span>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-secondary/60 text-muted-foreground rounded-full"
                    >
                      {comments.length}
                    </Badge>
                  </div>
                  {/* Sort toggle */}
                  <div className="flex items-center gap-0.5 bg-secondary/40 rounded-full p-1">
                    {(["newest", "top"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCommentSort(s)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${commentSort === s ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                        data-ocid={`player.comments.sort_${s}.tab`}
                      >
                        {s === "newest" ? "Newest" : "Top"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add comment */}
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) addComment();
                    }}
                    placeholder="Add a comment…"
                    className="flex-1 h-10 bg-secondary/40 border-border/30 text-sm rounded-2xl"
                    data-ocid="comments.add.input"
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    disabled={!newComment.trim()}
                    className="h-10 w-10 rounded-2xl bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
                    data-ocid="comments.add.submit_button"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* List */}
                {sortedComments.length === 0 ? (
                  <div
                    className="text-center py-8 text-muted-foreground text-sm"
                    data-ocid="comments.list.empty_state"
                  >
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No comments yet. Be the first!
                  </div>
                ) : (
                  <div className="space-y-5" data-ocid="comments.list">
                    {sortedComments.map((c, i) => (
                      <div key={c.id} data-ocid={`comments.item.${i + 1}`}>
                        <CommentItem
                          comment={c}
                          videoTitle={post.title}
                          creatorName={creatorName}
                          currentUser={currentUser}
                          onReplyPosted={onReply}
                          onDeleteComment={onDelete}
                          onTogglePin={onPin}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 7. SUGGESTED VIDEOS ──────────────────────────────── */}
              {suggested.length > 0 && (
                <div
                  className="px-4 pt-2 pb-6"
                  data-ocid="player.suggested.panel"
                >
                  <div className="h-px bg-border/15 mb-3" />
                  <p className="text-sm font-bold mb-2">Up Next</p>
                  <div className="space-y-1">
                    {suggested.map((v) => (
                      <SuggestedCard
                        key={v.id.toString()}
                        post={v}
                        onClick={() => {
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          {/* end animated wrapper */}
        </DialogContent>
      </Dialog>

      {/* ── PiP floating player ──────────────────────────────────────────── */}
      <AnimatePresence>
        {open && pipActive && (
          <PipPlayer
            videoRef={videoRef}
            title={post.title}
            onExpand={() => {
              setPipActive(false);
              scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDismiss={onClose}
          />
        )}
      </AnimatePresence>

      {/* ── Player settings modal ─────────────────────────────────────────── */}
      {open && (
        <PlayerSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          quality={quality}
          speed={speed}
          subtitle={subtitle}
          audio={audio}
          translating={translating}
          onSave={applyPlayerSettings}
        />
      )}

      {/* ── Playlist sheet ───────────────────────────────────────────────── */}
      {open && (
        <SaveToPlaylistSheet
          videoId={post.id}
          open={playlistOpen}
          onClose={() => setPlaylistOpen(false)}
        />
      )}

      {/* ── Share sheet ──────────────────────────────────────────────────── */}
      {open && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={post.title}
        />
      )}
    </>
  );
}
