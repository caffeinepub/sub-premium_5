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

// ─── Global AI Response Engine ────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "What is AI?",
  "Suggest video ideas",
  "Capital of France?",
  "Help with title",
] as const;

function generateGlobalAIReply(input: string): string {
  const q = input.toLowerCase().trim();

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q.startsWith("hello") ||
    q.startsWith("hi ")
  ) {
    return "Hey! I'm your SUB PREMIUM Global AI Assistant 👋\n\nI can help you with:\n• Geography, history & science\n• World leaders & countries\n• Technology & culture\n• Video ideas, titles & creator tools\n\nAsk me anything!";
  }

  // ── Help / Capabilities ────────────────────────────────────────────────────
  if (
    q.includes("help") ||
    q.includes("what can you do") ||
    q.includes("capabilities")
  ) {
    return "Here's what I can help with:\n\n🌍 World knowledge — geography, history, science\n👤 World leaders — presidents, prime ministers\n🏙️ Countries & capitals — facts & culture\n💡 Technology — AI, internet, inventions\n🎬 Creator tools — video ideas, titles, tags\n🔥 Trends — what's popular right now\n\nJust ask me anything!";
  }

  // ── World Leaders / Government ─────────────────────────────────────────────
  if (
    (q.includes("president") && q.includes("united states")) ||
    (q.includes("president") && q.includes("usa")) ||
    (q.includes("president") && q.includes("america") && !q.includes("south"))
  ) {
    return "The current President of the United States is Joe Biden (46th president). He took office on January 20, 2021.";
  }

  if (q.includes("president") && q.includes("france")) {
    return "The current President of France is Emmanuel Macron. He has been president since May 2017.";
  }

  if (
    (q.includes("prime minister") && q.includes("uk")) ||
    (q.includes("prime minister") && q.includes("england")) ||
    (q.includes("prime minister") && q.includes("britain")) ||
    (q.includes("prime minister") && q.includes("united kingdom"))
  ) {
    return "The current Prime Minister of the United Kingdom is Rishi Sunak. He took office in October 2022.";
  }

  if (q.includes("president") && q.includes("russia")) {
    return "The President of Russia is Vladimir Putin. He has served multiple terms since 2000.";
  }

  if (q.includes("president") && q.includes("china")) {
    return "The President of China is Xi Jinping. He has been in power since 2013.";
  }

  if (q.includes("president") && q.includes("brazil")) {
    return "The President of Brazil is Luiz Inácio Lula da Silva (Lula). He returned to office in January 2023.";
  }

  if (q.includes("chancellor") && q.includes("germany")) {
    return "The Chancellor of Germany is Olaf Scholz. He took office in December 2021.";
  }

  if (
    (q.includes("prime minister") && q.includes("india")) ||
    (q.includes("pm") && q.includes("india"))
  ) {
    return "The Prime Minister of India is Narendra Modi. He has been in office since 2014.";
  }

  // ── Countries and Capitals ─────────────────────────────────────────────────
  if (q.includes("capital") && q.includes("france")) {
    return "The capital of France is Paris. It is also the largest city in France and a major global center for art, culture, and fashion.";
  }

  if (q.includes("capital") && q.includes("japan")) {
    return "The capital of Japan is Tokyo. It is one of the most populous cities in the world.";
  }

  if (
    (q.includes("capital") && q.includes("usa")) ||
    (q.includes("capital") && q.includes("united states")) ||
    (q.includes("capital") &&
      q.includes("america") &&
      !q.includes("south") &&
      !q.includes("latin"))
  ) {
    return "The capital of the United States is Washington, D.C. (District of Columbia). It is the seat of the U.S. federal government.";
  }

  if (q.includes("capital") && q.includes("germany")) {
    return "The capital of Germany is Berlin. It is the largest city in Germany.";
  }

  if (q.includes("capital") && q.includes("brazil")) {
    return "The capital of Brazil is Brasília. It was purpose-built as the capital and inaugurated in 1960.";
  }

  if (q.includes("capital") && q.includes("china")) {
    return "The capital of China is Beijing. It has been the political center of China for centuries.";
  }

  if (q.includes("capital") && q.includes("australia")) {
    return "The capital of Australia is Canberra, not Sydney or Melbourne as many people assume.";
  }

  if (q.includes("capital") && q.includes("russia")) {
    return "The capital of Russia is Moscow. It is also the largest city in Russia.";
  }

  if (q.includes("capital") && q.includes("italy")) {
    return "The capital of Italy is Rome, also known as the Eternal City.";
  }

  if (q.includes("capital") && q.includes("spain")) {
    return "The capital of Spain is Madrid.";
  }

  if (q.includes("capital") && q.includes("canada")) {
    return "The capital of Canada is Ottawa, located in the province of Ontario.";
  }

  if (q.includes("capital") && q.includes("mexico")) {
    return "The capital of Mexico is Mexico City (Ciudad de México).";
  }

  if (q.includes("capital") && q.includes("india")) {
    return "The capital of India is New Delhi.";
  }

  if (q.includes("capital") && q.includes("uk")) {
    return "The capital of the United Kingdom is London. It is one of the world's leading financial and cultural centers.";
  }

  if (q.includes("capital") && q.includes("egypt")) {
    return "The capital of Egypt is Cairo. It is the largest city in Africa.";
  }

  if (q.includes("capital") && q.includes("south africa")) {
    return "South Africa has three capitals: Pretoria (executive), Cape Town (legislative), and Bloemfontein (judicial).";
  }

  if (q.includes("capital") && q.includes("argentina")) {
    return "The capital of Argentina is Buenos Aires.";
  }

  if (q.includes("capital of")) {
    return "I don't have that capital on hand right now, but you can find it quickly on any geography reference site.";
  }

  // ── Geography / World Facts ────────────────────────────────────────────────
  if (
    q.includes("tallest building") ||
    q.includes("highest building") ||
    q.includes("tallest skyscraper")
  ) {
    return "The tallest building in the world is the Burj Khalifa in Dubai, UAE. It stands at 828 meters (2,717 feet) tall and was completed in 2010.";
  }

  if (q.includes("longest river")) {
    return "The longest river in the world is the Nile River in Africa, stretching approximately 6,650 kilometers (4,130 miles). The Amazon River in South America is a close second.";
  }

  if (
    q.includes("largest country") ||
    (q.includes("biggest country") && q.includes("land"))
  ) {
    return "The largest country in the world by land area is Russia, covering approximately 17.1 million square kilometers.";
  }

  if (q.includes("smallest country")) {
    return "The smallest country in the world is Vatican City, located within Rome, Italy. It covers just 0.44 square kilometers.";
  }

  if (
    q.includes("highest mountain") ||
    q.includes("tallest mountain") ||
    q.includes("mount everest") ||
    q.includes("mt everest")
  ) {
    return "The highest mountain in the world is Mount Everest, standing at 8,849 meters (29,032 feet) above sea level. It is located in the Himalayas on the border of Nepal and Tibet.";
  }

  if (q.includes("largest ocean")) {
    return "The largest ocean in the world is the Pacific Ocean. It covers more than 165 million square kilometers, making it larger than all of Earth's landmasses combined.";
  }

  if (
    q.includes("deepest ocean") ||
    q.includes("deepest point") ||
    q.includes("mariana trench")
  ) {
    return "The deepest point in the world is the Mariana Trench in the Pacific Ocean, reaching approximately 11,034 meters (36,200 feet) at its deepest point, called Challenger Deep.";
  }

  if (q.includes("largest continent")) {
    return "The largest continent by area is Asia, covering approximately 44.6 million square kilometers.";
  }

  if (
    q.includes("most populous country") ||
    q.includes("most populated country") ||
    q.includes("largest population")
  ) {
    return "The most populous country in the world is India, which surpassed China in 2023 with over 1.4 billion people.";
  }

  if (q.includes("how many continents") || q.includes("number of continents")) {
    return "There are 7 continents on Earth: Africa, Antarctica, Asia, Australia (Oceania), Europe, North America, and South America.";
  }

  if (q.includes("how many planets") || q.includes("number of planets")) {
    return "There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Pluto was reclassified as a dwarf planet in 2006.";
  }

  if (q.includes("what is the solar system") || q.includes("solar system")) {
    return "The solar system consists of the Sun and all the objects that orbit it, including 8 planets, 5 officially recognized dwarf planets, moons, asteroids, and comets. It is located in the Milky Way galaxy.";
  }

  if (q.includes("climate change") || q.includes("global warming")) {
    return "Climate change refers to long-term shifts in global temperatures and weather patterns. While some climate change is natural, since the 20th century human activities — especially burning fossil fuels — have been the main driver of rapid climate change. It leads to rising sea levels, extreme weather events, and ecosystem disruption.";
  }

  // ── Science ────────────────────────────────────────────────────────────────
  if (
    q.includes("what is artificial intelligence") ||
    q.includes("what is ai") ||
    q === "ai" ||
    (q.includes("artificial intelligence") && q.includes("what"))
  ) {
    return "Artificial Intelligence (AI) is the simulation of human intelligence by computer systems. It includes machine learning, natural language processing, computer vision, and robotics. AI systems can learn from data, recognize patterns, make decisions, and perform tasks that typically require human intelligence.";
  }

  if (q.includes("speed of light")) {
    return "The speed of light in a vacuum is approximately 299,792,458 meters per second (about 300,000 km/s or 186,000 miles per second). It is denoted by the letter 'c' and is a fundamental constant in physics.";
  }

  if (q.includes("what is dna") || q === "dna") {
    return "DNA (Deoxyribonucleic Acid) is the molecule that carries the genetic instructions for the development, functioning, growth, and reproduction of all known organisms. It is shaped like a double helix and contains four chemical bases: adenine, thymine, guanine, and cytosine.";
  }

  if (
    q.includes("what is gravity") ||
    (q.includes("gravity") && q.includes("what"))
  ) {
    return "Gravity is a fundamental force of nature that attracts objects with mass toward each other. On Earth, it gives weight to physical objects and causes them to fall toward the ground. It was first mathematically described by Sir Isaac Newton and later refined by Albert Einstein's theory of general relativity.";
  }

  if (
    q.includes("who discovered gravity") ||
    q.includes("who invented gravity")
  ) {
    return "Gravity was famously described by Sir Isaac Newton around 1666, inspired (according to legend) by seeing an apple fall from a tree. He formulated the law of universal gravitation.";
  }

  if (q.includes("photosynthesis")) {
    return "Photosynthesis is the process by which plants, algae, and some bacteria convert sunlight, water, and carbon dioxide into glucose (sugar) and oxygen. It is the foundation of most life on Earth.";
  }

  // ── Technology ─────────────────────────────────────────────────────────────
  if (
    q.includes("who invented the internet") ||
    q.includes("who created the internet")
  ) {
    return "The internet was developed over several decades. The foundational work was done by ARPANET in the 1960s (funded by the U.S. Department of Defense). Tim Berners-Lee invented the World Wide Web in 1989, which made the internet accessible to the public.";
  }

  if (
    q.includes("who invented the telephone") ||
    q.includes("who created the telephone")
  ) {
    return "The telephone was invented by Alexander Graham Bell, who received the first patent for it in 1876.";
  }

  if (
    q.includes("who invented the airplane") ||
    q.includes("wright brothers")
  ) {
    return "The airplane was invented by the Wright Brothers — Orville and Wilbur Wright. They made the first successful powered flight on December 17, 1903, at Kitty Hawk, North Carolina.";
  }

  if (
    q.includes("who invented electricity") ||
    q.includes("who discovered electricity") ||
    q.includes("benjamin franklin")
  ) {
    return "Electricity was not invented by one person, but Benjamin Franklin is famous for his experiments with lightning in the 1750s. Thomas Edison developed the first practical electric light bulb and power distribution system in 1879.";
  }

  if (q.includes("machine learning") && q.includes("what")) {
    return "Machine learning is a subset of artificial intelligence where systems learn from data to improve their performance over time without being explicitly programmed. It powers recommendation engines, image recognition, voice assistants, and much more.";
  }

  if (
    q.includes("what is blockchain") ||
    (q.includes("blockchain") && q.includes("what"))
  ) {
    return "Blockchain is a distributed digital ledger technology that records transactions across many computers in a secure, transparent, and tamper-resistant way. It is the underlying technology behind cryptocurrencies like Bitcoin.";
  }

  if (
    q.includes("what is bitcoin") ||
    (q.includes("bitcoin") && q.includes("what"))
  ) {
    return "Bitcoin is the world's first and most well-known cryptocurrency. It was created in 2009 by an anonymous person or group known as Satoshi Nakamoto. It operates on blockchain technology and allows peer-to-peer transactions without a central bank.";
  }

  // ── History ────────────────────────────────────────────────────────────────
  if (
    q.includes("world war 1") ||
    q.includes("first world war") ||
    q.includes("ww1") ||
    q.includes("wwi")
  ) {
    return "World War I (1914–1918) was a global conflict centered in Europe. It was triggered by the assassination of Archduke Franz Ferdinand of Austria-Hungary. The war involved most of the world's great powers and resulted in over 17 million deaths. It ended with the Treaty of Versailles in 1919.";
  }

  if (
    q.includes("world war 2") ||
    q.includes("second world war") ||
    q.includes("ww2") ||
    q.includes("wwii")
  ) {
    return "World War II (1939–1945) was the deadliest conflict in human history, involving over 30 countries and resulting in 70–85 million deaths. It began with Germany's invasion of Poland and ended with the defeat of Nazi Germany and Imperial Japan. The war led to the formation of the United Nations.";
  }

  if (q.includes("napoleon")) {
    return "Napoleon Bonaparte (1769–1821) was a French military and political leader who rose to prominence during the French Revolution. He became Emperor of the French and conquered much of Europe before being defeated and exiled.";
  }

  if (q.includes("french revolution")) {
    return "The French Revolution (1789–1799) was a period of radical political and societal change in France. It led to the overthrow of the monarchy, the establishment of a republic, and the rise of Napoleon Bonaparte.";
  }

  if (q.includes("einstein") || q.includes("albert einstein")) {
    return "Albert Einstein (1879–1955) was a German-born theoretical physicist who developed the theory of relativity, one of the two pillars of modern physics. He is best known for the mass-energy equivalence formula E=mc². He won the Nobel Prize in Physics in 1921.";
  }

  // ── Entertainment ──────────────────────────────────────────────────────────
  if (
    q.includes("highest grossing movie") ||
    q.includes("best selling movie") ||
    q.includes("most watched movie") ||
    q.includes("top grossing")
  ) {
    return "The highest-grossing film of all time is Avatar (2009, re-released 2022) directed by James Cameron, earning over $2.9 billion worldwide. Avatar: The Way of Water (2022) is also in the top 5.";
  }

  if (q.includes("taylor swift")) {
    return "Taylor Swift is one of the best-selling music artists of all time. She is an American singer-songwriter known for her country and pop music, with albums including Fearless, 1989, Reputation, and The Eras Tour.";
  }

  if (
    q.includes("richest person") ||
    q.includes("wealthiest person") ||
    q.includes("richest man") ||
    q.includes("richest woman")
  ) {
    return "As of recent rankings, the richest people in the world include Elon Musk (Tesla, SpaceX), Jeff Bezos (Amazon), and Bernard Arnault (LVMH). Rankings change frequently based on stock valuations.";
  }

  // ── Creator Tools (preserved) ──────────────────────────────────────────────
  if (
    q.includes("video idea") ||
    q.includes("what to make") ||
    q.includes("content idea")
  ) {
    return 'Here are some hot video ideas right now:\n\n• "A Day in My Life" vlog series\n• Tutorial: How to master your niche in 30 days\n• React vs. Reaction: Comparing trends in your category\n• Behind-the-scenes of your creative process\n• Top 10 mistakes beginners make in [your niche]\n\nWant me to tailor ideas to a specific category?';
  }

  if (
    q.includes("trend") ||
    q.includes("popular") ||
    q.includes("hot topic") ||
    q.includes("viral")
  ) {
    return 'Trending right now on SUB PREMIUM:\n\n🔥 Short-form storytelling (60s stories)\n🎬 Mini documentaries\n💡 "No equipment needed" tutorials\n🎵 Reaction & commentary videos\n🚀 Creator growth tips\n\nShorts and quick tutorials are getting the most engagement this week!';
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

  if (q.includes("playlist") || q.includes("series")) {
    return "Playlists boost watch time significantly! Here's how to structure them:\n\n• Group videos by topic or difficulty level\n• Name playlists with searchable keywords\n• Add a short intro video as the first in each list\n• Keep playlists to 5–15 videos for best completion rates\n• Pin your best playlist to your profile\n\nShall I suggest playlist categories based on your content?";
  }

  if (
    q.includes("watch") ||
    q.includes("something to see") ||
    q.includes("recommend") ||
    q.includes("suggest") ||
    q.includes("find")
  ) {
    return "Based on what's popular right now, I recommend:\n\n🎬 Movies section for cinematic content\n⚡ Shorts for quick entertainment (< 60s)\n🌟 Premium for exclusive, ad-free content\n📈 Trending tab for what everyone's watching\n\nHead to the Home tab and use the category filters to explore!";
  }

  // ── Travel Vlog Ideas ──────────────────────────────────────────────────────
  if (
    q.includes("travel vlog") ||
    (q.includes("travel") && q.includes("idea"))
  ) {
    return "Here are some travel vlog ideas:\n\n1. 24 Hours Exploring Tokyo\n2. Best Street Food in Bangkok\n3. Hidden Beaches You Must Visit\n4. Solo Travel Guide for Budget Travelers\n5. Europe in 10 Days: The Ultimate Itinerary\n6. Most Underrated Cities in the World\n\nWant ideas for a specific destination?";
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return `That's a great question! While I may not have the most up-to-date information on that specific topic, here's what I know: I'm your Global AI Assistant covering geography, history, science, world leaders, technology, culture, and creator tools.\n\nFor the most current details on "${input}", I recommend checking a reliable source. Is there anything else I can help you with?`;
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
        const reply = generateGlobalAIReply(trimmed);
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
                    Global AI — ready to answer anything
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
