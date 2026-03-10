import { Bot, Globe, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

// ─── Quick Suggestions ───────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "What is AI?",
  "Suggest video ideas",
  "Capital of France?",
  "Who invented the internet?",
] as const;

// ─── Creator Query Detection ─────────────────────────────────────────────────

function isCreatorQuery(q: string): boolean {
  const lower = q.toLowerCase();
  const creatorKeywords = [
    "video idea",
    "video ideas",
    "title",
    "hashtag",
    "thumbnail",
    "channel",
    "content idea",
    "content strategy",
    "script",
    "description",
    "trending topic",
    "vlog",
    "shorts idea",
    "youtube",
    "creator",
    "upload tip",
    "what to make",
    "what to upload",
    "tag",
    "keyword",
    "playlist",
    "series idea",
  ];
  return creatorKeywords.some((kw) => lower.includes(kw));
}

// ─── Creator Tools (local, instant) ──────────────────────────────────────────

function getCreatorAnswer(input: string): string {
  const q = input.toLowerCase().trim();

  if (
    q.includes("travel vlog") ||
    (q.includes("travel") && q.includes("idea"))
  ) {
    return "Here are some travel vlog ideas:\n\n1. 24 Hours Exploring Tokyo\n2. Best Street Food in Bangkok\n3. Hidden Beaches You Must Visit\n4. Solo Travel Guide for Budget Travelers\n5. Europe in 10 Days: The Ultimate Itinerary\n6. Most Underrated Cities in the World\n\nWant ideas for a specific destination?";
  }

  if (
    q.includes("video idea") ||
    q.includes("what to make") ||
    q.includes("content idea")
  ) {
    return 'Here are some hot video ideas right now:\n\n• "A Day in My Life" vlog series\n• Tutorial: How to master your niche in 30 days\n• React vs. Reaction: Comparing trends in your category\n• Behind-the-scenes of your creative process\n• Top 10 mistakes beginners make in [your niche]\n\nWant me to tailor ideas to a specific category?';
  }

  if (
    q.includes("title") ||
    q.includes("headline") ||
    q.includes("name my video")
  ) {
    return 'Great titles follow this formula:\n\n• [Number] + [Outcome] + [Time frame]\n  e.g. "5 Ways to Go Viral in 7 Days"\n\n• [Question] + [Surprising Answer]\n  e.g. "Why Most Creators Fail (And How to Fix It)"\n\n• [How to] + [Desired Result] + [Without pain point]\n  e.g. "How to Grow Without Spending a Dime"\n\nTell me your topic and I\'ll generate some title options for you!';
  }

  if (
    q.includes("description") ||
    q.includes("bio") ||
    q.includes("about section")
  ) {
    return 'A strong video description should:\n\n1. Start with a hook (first 2 lines are shown before "more")\n2. Summarize what viewers will learn or see\n3. Include 3–5 relevant keywords naturally\n4. Add a call-to-action: subscribe, comment, or share\n5. Link to related videos or playlists\n\nShare your video topic and I can draft a description for you!';
  }

  if (q.includes("tag") || q.includes("hashtag") || q.includes("keyword")) {
    return "Smart tagging tips:\n\n• Use 5–10 specific tags per video\n• Mix broad tags (#tutorials) with niche ones (#beginnerphotoediting)\n• Include your channel name as a tag\n• Use tags your audience actually searches for\n• Check what tags top videos in your niche use\n\nTell me your video topic and I'll suggest specific tags!";
  }

  if (q.includes("thumbnail")) {
    return "Thumbnail best practices:\n\n• Use high contrast — bright colors on dark backgrounds\n• Show a clear face with an expressive emotion\n• Add 3–5 bold words max (readable on mobile)\n• Use consistent fonts and colors across your channel\n• A/B test different thumbnails for the same video\n\nNeed help designing a thumbnail concept for a specific topic?";
  }

  if (q.includes("playlist") || q.includes("series")) {
    return "Playlists boost watch time significantly! Here's how to structure them:\n\n• Group videos by topic or difficulty level\n• Name playlists with searchable keywords\n• Add a short intro video as the first in each list\n• Keep playlists to 5–15 videos for best completion rates\n• Pin your best playlist to your profile\n\nShall I suggest playlist categories based on your content?";
  }

  if (q.includes("upload tip") || q.includes("upload")) {
    return "Top upload tips for SUB PREMIUM creators:\n\n• Upload consistently — at least 2–3 times per week\n• Post when your audience is most active (check analytics)\n• Use a strong hook in the first 3 seconds\n• Respond to comments in the first hour (boosts algorithm)\n• Cross-promote on other platforms\n\nConsistency beats perfection every time!";
  }

  // Generic creator fallback
  return "Here are some creator tips for SUB PREMIUM:\n\n🎬 Video ideas — Ask me for topic-specific ideas\n📝 Titles — I can write click-worthy headlines\n#️⃣ Hashtags — I'll suggest tags for your niche\n📖 Descriptions — I can draft compelling copy\n💡 Strategy — Growth and monetization advice\n\nTell me more about your content and I'll get specific!";
}

// ─── DuckDuckGo Instant Answer API ───────────────────────────────────────────

async function searchDuckDuckGo(query: string): Promise<string | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Answer && data.Answer.length > 10) {
      return data.Answer;
    }
    if (data.AbstractText && data.AbstractText.length > 20) {
      const source = data.AbstractSource
        ? ` (Source: ${data.AbstractSource})`
        : "";
      return `${data.AbstractText}${source}`;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Wikipedia Summary API ───────────────────────────────────────────────────

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.extract || data.extract.length < 20) return null;
    // Return first 2 sentences
    const sentences = data.extract.split(". ");
    const short = sentences.slice(0, 2).join(". ");
    return short.endsWith(".") ? short : `${short}.`;
  } catch {
    return null;
  }
}

// ─── Quick Local Answers (no network needed for common questions) ─────────────

function getLocalAnswer(q: string): string | null {
  const lower = q.toLowerCase().trim();

  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey" ||
    lower.startsWith("hello ") ||
    lower.startsWith("hi ")
  ) {
    return "Hey! I'm your SUB PREMIUM Global AI Assistant 👋\n\nI can help you with:\n• Geography, history & science\n• World leaders & countries\n• Technology & culture\n• Video ideas, titles & creator tools\n\nAsk me anything!";
  }

  if (
    lower.includes("help") ||
    lower.includes("what can you do") ||
    lower.includes("capabilities")
  ) {
    return "Here's what I can help with:\n\n🌍 World knowledge — geography, history, science\n👤 World leaders — presidents, prime ministers\n🏙️ Countries & capitals — facts & culture\n💡 Technology — AI, internet, inventions\n🎬 Creator tools — video ideas, titles, tags\n🔥 Trends — what's popular right now\n\nJust ask me anything!";
  }

  return null;
}

// ─── Global Answer Orchestrator ──────────────────────────────────────────────

async function getGlobalAnswer(query: string): Promise<string> {
  const trimmed = query.trim();

  // 1. Quick local greetings / help
  const local = getLocalAnswer(trimmed);
  if (local) return local;

  // 2. Creator tools — handled locally, no network needed
  if (isCreatorQuery(trimmed)) {
    return getCreatorAnswer(trimmed);
  }

  // 3. Try DuckDuckGo Instant Answer
  const ddgResult = await searchDuckDuckGo(trimmed);
  if (ddgResult) {
    return ddgResult;
  }

  // 4. Try Wikipedia summary
  const wikiResult = await searchWikipedia(trimmed);
  if (wikiResult) {
    return wikiResult;
  }

  // 5. No reliable answer found
  return "I couldn't find reliable information for that question. Try rephrasing or asking something more specific.";
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
      text: "Hey! I'm your SUB PREMIUM Global AI Assistant.\n\nI can answer questions about:\n• Geography, history & science\n• World leaders & countries\n• Technology & culture\n• Video ideas, titles & creator tools\n\nAsk me anything!",
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
    async (text: string) => {
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

      try {
        const reply = await getGlobalAnswer(trimmed);
        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: "ai",
          text: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const errorMsg: Message = {
          id: `a-${Date.now()}`,
          role: "ai",
          text: "I couldn't find reliable information for that question. Try rephrasing or asking something more specific.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
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
                  <Globe className="w-2.5 h-2.5 text-green-500" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Global Knowledge Search
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#FF2D2D] bg-[#FF2D2D]/10 border border-[#FF2D2D]/20 rounded-full px-2 py-0.5">
                GLOBAL
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
                  placeholder="Ask me anything..."
                  disabled={isTyping}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none border-none min-w-0 disabled:opacity-50"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                />
                <motion.button
                  type="button"
                  data-ocid="ai_assistant.send_button"
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
