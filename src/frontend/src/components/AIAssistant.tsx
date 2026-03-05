import { Bot, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

// ─── Simulated AI Response Engine ────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "Suggest video ideas",
  "Trending topics",
  "Help with title",
  "Find something to watch",
] as const;

function generateSmartReply(input: string): string {
  const q = input.toLowerCase().trim();

  // Video ideas
  if (
    q.includes("video idea") ||
    q.includes("what to make") ||
    q.includes("content idea")
  ) {
    return 'Here are some hot video ideas right now:\n\n• "A Day in My Life" vlog series\n• Tutorial: How to master your niche in 30 days\n• React vs. Reaction: Comparing trends in your category\n• Behind-the-scenes of your creative process\n• Top 10 mistakes beginners make in [your niche]\n\nWant me to tailor ideas to a specific category?';
  }

  // Trending topics
  if (
    q.includes("trend") ||
    q.includes("popular") ||
    q.includes("hot") ||
    q.includes("viral")
  ) {
    return 'Trending right now on SUB PREMIUM:\n\n🔥 Short-form storytelling (60s stories)\n🎬 Mini documentaries\n💡 "No equipment needed" tutorials\n🎵 Reaction & commentary videos\n🚀 Creator growth tips\n\nShorts and quick tutorials are getting the most engagement this week!';
  }

  // Title help
  if (
    q.includes("title") ||
    q.includes("headline") ||
    q.includes("name my video")
  ) {
    return 'Great titles follow this formula:\n\n• [Number] + [Outcome] + [Time frame]\n  e.g. "5 Ways to Go Viral in 7 Days"\n\n• [Question] + [Surprising Answer]\n  e.g. "Why Most Creators Fail (And How to Fix It)"\n\n• [How to] + [Desired Result] + [Without pain point]\n  e.g. "How to Grow Without Spending a Dime"\n\nTell me your topic and I\'ll generate some title options for you!';
  }

  // Description help
  if (
    q.includes("description") ||
    q.includes("bio") ||
    q.includes("about section")
  ) {
    return 'A strong video description should:\n\n1. Start with a hook (first 2 lines are shown before "more")\n2. Summarize what viewers will learn or see\n3. Include 3–5 relevant keywords naturally\n4. Add a call-to-action: subscribe, comment, or share\n5. Link to related videos or playlists\n\nShare your video topic and I can draft a description for you!';
  }

  // Tags
  if (q.includes("tag") || q.includes("hashtag") || q.includes("keyword")) {
    return "Smart tagging tips:\n\n• Use 5–10 specific tags per video\n• Mix broad tags (#tutorials) with niche ones (#beginnerphotoediting)\n• Include your channel name as a tag\n• Use tags your audience actually searches for\n• Check what tags top videos in your niche use\n\nTell me your video topic and I'll suggest specific tags!";
  }

  // Playlist help
  if (q.includes("playlist") || q.includes("series")) {
    return "Playlists boost watch time significantly! Here's how to structure them:\n\n• Group videos by topic or difficulty level\n• Name playlists with searchable keywords\n• Add a short intro video as the first in each list\n• Keep playlists to 5–15 videos for best completion rates\n• Pin your best playlist to your profile\n\nShall I suggest playlist categories based on your content?";
  }

  // What to watch
  if (
    q.includes("watch") ||
    q.includes("something to see") ||
    q.includes("recommend") ||
    q.includes("suggest") ||
    q.includes("find")
  ) {
    return "Based on what's popular right now, I recommend:\n\n🎬 Movies section for cinematic content\n⚡ Shorts for quick entertainment (< 60s)\n🌟 Premium for exclusive, ad-free content\n📈 Trending tab for what everyone's watching\n\nHead to the Home tab and use the category filters to explore!";
  }

  // Greetings
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q.startsWith("hello") ||
    q.startsWith("hi ")
  ) {
    return "Hey! I'm your SUB PREMIUM AI Assistant 👋\n\nI can help you:\n• Generate video ideas\n• Write titles & descriptions\n• Suggest tags\n• Find content to watch\n• Share trending topics\n\nWhat can I help you with today?";
  }

  // Help
  if (
    q.includes("help") ||
    q.includes("what can you do") ||
    q.includes("capabilities")
  ) {
    return "Here's what I can help with:\n\n🎯 Video ideas — never run out of content\n✍️ Titles — write click-worthy headlines\n📝 Descriptions — craft SEO-friendly copy\n🏷️ Tags — find the right keywords\n📋 Playlists — organize your content\n🔥 Trends — stay ahead of the curve\n🎬 Recommendations — find great content\n\nJust ask me anything!";
  }

  // Fallback
  return `I heard you say: "${input}"\n\nHere's what I can help with:\n• Video ideas & content strategy\n• Writing titles and descriptions\n• Suggesting tags and keywords\n• Finding trending topics\n• Recommending what to watch\n\nTry asking something like "Give me video ideas" or "Help with my title"!`;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-[#FF2D2D]/20 border border-[#FF2D2D]/30 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-[#FF2D2D]" />
      </div>
      <div className="bg-[#1C1C1C] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D]/60"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-end gap-2 mb-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#FF2D2D]/20 border border-[#FF2D2D]/30 flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="w-3.5 h-3.5 text-[#FF2D2D]" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={[
          "max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-[#FF2D2D] text-white rounded-2xl rounded-br-sm"
            : "bg-[#1C1C1C] text-white/90 rounded-2xl rounded-bl-sm border border-white/5",
        ].join(" ")}
      >
        {message.text}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hey! I'm your SUB PREMIUM AI Assistant.\n\nI can help you with video ideas, titles, descriptions, tags, and finding great content to watch. How can I help you today?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      // Simulate AI thinking delay
      const delay = 800 + Math.random() * 700;
      setTimeout(() => {
        const reply = generateSmartReply(trimmed);
        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: "ai",
          text: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, delay);
    },
    [isTyping],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ai-fab"
            type="button"
            data-ocid="ai_assistant.open_modal_button"
            aria-label="Open AI Assistant"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D]/50"
            style={{
              right: 16,
              top: 120,
              background: "linear-gradient(135deg, #FF2D2D 0%, #cc1a1a 100%)",
              boxShadow:
                "0 0 20px rgba(255,45,45,0.5), 0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <Bot className="w-6 h-6 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#FF2D2D]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full-screen chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-chat"
            data-ocid="ai_assistant.modal"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 36,
              mass: 1,
            }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "#0E0E0E" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5 shrink-0"
              style={{
                background: "linear-gradient(180deg, #1A1A1A 0%, #0E0E0E 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-full bg-[#FF2D2D]/20 border border-[#FF2D2D]/40 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#FF2D2D]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white tracking-tight">
                  AI Assistant
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Online — ready to help
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#FF2D2D] bg-[#FF2D2D]/10 border border-[#FF2D2D]/20 rounded-full px-2 py-0.5">
                BETA
              </span>
              <button
                type="button"
                data-ocid="ai_assistant.close_button"
                aria-label="Close AI Assistant"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D]/40 ml-1"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions */}
            <div className="px-4 pb-2 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-ocid="ai_assistant.suggestion.button"
                    onClick={() => handleSuggestion(s)}
                    disabled={isTyping}
                    className="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap
                               text-white/70 bg-[#1C1C1C] border border-white/8
                               rounded-full px-3 py-1.5
                               hover:bg-[#FF2D2D]/10 hover:border-[#FF2D2D]/30 hover:text-white
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF2D2D]/40"
                  >
                    <Sparkles className="w-3 h-3 text-[#FF2D2D]" />
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div
              className="px-4 pb-8 pt-3 border-t border-white/5 shrink-0"
              style={{ background: "#0E0E0E" }}
            >
              <div
                className="flex items-center gap-3 bg-[#1C1C1C] rounded-2xl px-4 py-2.5 border border-white/8"
                style={
                  input
                    ? { boxShadow: "0 0 0 1.5px rgba(255,45,45,0.45)" }
                    : undefined
                }
              >
                <input
                  ref={inputRef}
                  type="text"
                  data-ocid="ai_assistant.input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={isTyping}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none border-none min-w-0 disabled:opacity-50"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                />
                <motion.button
                  type="button"
                  data-ocid="ai_assistant.submit_button"
                  aria-label="Send message"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D]/50 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    input.trim() && !isTyping
                      ? {
                          background: "#FF2D2D",
                          boxShadow: "0 0 10px rgba(255,45,45,0.4)",
                        }
                      : { background: "#2a2a2a" }
                  }
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
