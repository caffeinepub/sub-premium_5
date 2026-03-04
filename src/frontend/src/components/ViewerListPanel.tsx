import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Gift, Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

type FilterMode = "active" | "recent" | "gifters";

export interface ViewerEntry {
  name: string;
  score: number;
  joinedAgo: number;
}

interface ViewerListPanelProps {
  open: boolean;
  onClose: () => void;
  onInviteToCoHost: (username: string) => void;
  viewers?: ViewerEntry[];
  onOpenProfile?: (username: string) => void;
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #FF6B6B, #FF2D2D)",
  "linear-gradient(135deg, #4FACFE, #00C6FF)",
  "linear-gradient(135deg, #43E97B, #38F9D7)",
  "linear-gradient(135deg, #FA8231, #F7971E)",
  "linear-gradient(135deg, #A55EEA, #7B2FFF)",
  "linear-gradient(135deg, #26DE81, #20BF6B)",
  "linear-gradient(135deg, #FC5C7D, #6A3093)",
];

export function ViewerListPanel({
  open,
  onClose,
  onInviteToCoHost,
  viewers = [],
  onOpenProfile,
}: ViewerListPanelProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [search, setSearch] = useState("");

  const sortedViewers = useMemo(() => {
    let sorted = [...viewers];
    if (filterMode === "active") sorted.sort((a, b) => b.score - a.score);
    else if (filterMode === "recent")
      sorted.sort((a, b) => a.joinedAgo - b.joinedAgo);
    else if (filterMode === "gifters")
      sorted.sort((a, b) => b.score * 0.3 - a.score * 0.3);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      sorted = sorted.filter((v) => v.name.toLowerCase().includes(q));
    }
    return sorted;
  }, [filterMode, search, viewers]);

  const filters: { id: FilterMode; label: string }[] = [
    { id: "active", label: "Most Active" },
    { id: "recent", label: "Recent Join" },
    { id: "gifters", label: "Top Gifters" },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 p-0"
        style={{ background: "#0f0f0f", maxHeight: "90vh" }}
        data-ocid="viewer_list.panel"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-white text-base font-bold">
                Viewers
              </SheetTitle>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "#FF2D2D", color: "white" }}
              >
                {viewers.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1a1a" }}
              data-ocid="viewer_list.close.button"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search viewers..."
              data-ocid="viewer_list.search.input"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filterMode === f.id ? "#FF2D2D" : "#1a1a1a",
                  color: filterMode === f.id ? "#fff" : "#888",
                  border: `1px solid ${filterMode === f.id ? "#FF2D2D" : "#2a2a2a"}`,
                }}
                data-ocid="viewer_list.filter.tab"
              >
                {f.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="px-5 pb-8" style={{ maxHeight: "58vh" }}>
          <div className="flex flex-col gap-2 pb-4">
            {sortedViewers.length === 0 ? (
              <div
                className="text-center py-12 text-gray-500 text-sm"
                data-ocid="viewer_list.empty_state"
              >
                No viewers yet — be the first!
              </div>
            ) : (
              sortedViewers.map((viewer, idx) => {
                const gradient =
                  AVATAR_COLORS[idx % AVATAR_COLORS.length] ??
                  AVATAR_COLORS[0]!;
                return (
                  <div
                    key={viewer.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "#111", border: "1px solid #1e1e1e" }}
                    data-ocid={`viewer_list.item.${idx + 1}`}
                  >
                    {/* Rank */}
                    <span
                      className="text-xs font-bold w-5 text-center flex-shrink-0"
                      style={{
                        color:
                          idx === 0
                            ? "#FFD700"
                            : idx === 1
                              ? "#C0C0C0"
                              : idx === 2
                                ? "#CD7F32"
                                : "#555",
                      }}
                    >
                      #{idx + 1}
                    </span>

                    {/* Avatar — clickable */}
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(viewer.name)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: gradient,
                        cursor: onOpenProfile ? "pointer" : "default",
                      }}
                      data-ocid={`viewer_list.avatar.button.${idx + 1}`}
                      title={`View ${viewer.name}'s profile`}
                    >
                      <span className="text-white text-xs font-black">
                        {viewer.name[0]?.toUpperCase()}
                      </span>
                    </button>

                    {/* Info — username clickable */}
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenProfile?.(viewer.name)}
                        className="text-white text-sm font-semibold truncate block hover:underline bg-transparent border-0 p-0 text-left"
                        style={{
                          cursor: onOpenProfile ? "pointer" : "default",
                        }}
                        data-ocid={`viewer_list.username.button.${idx + 1}`}
                      >
                        @{viewer.name}
                      </button>
                      <p className="text-gray-600 text-[10px]">
                        {viewer.score.toLocaleString()} pts · {viewer.joinedAgo}
                        m ago
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onInviteToCoHost(viewer.name)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,45,45,0.15)" }}
                        title="Invite to co-host"
                        data-ocid={`viewer_list.invite.button.${idx + 1}`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-red-400" />
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,215,0,0.12)" }}
                        title="Send gift"
                        data-ocid={`viewer_list.gift.button.${idx + 1}`}
                      >
                        <Gift className="w-3.5 h-3.5 text-yellow-400" />
                      </button>
                    </div>
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
