import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Clock, Send, UserCheck, UserX, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { InviteRequest } from "../hooks/useCoHostSystem";

const MOCK_VIEWERS = [
  "alex_v",
  "sarah_m",
  "james_k",
  "priya_d",
  "tony_r",
  "luna_s",
  "max_c",
  "belle_w",
  "carlos_g",
  "yuki_t",
];

interface CoHostInviteModalProps {
  open: boolean;
  onClose: () => void;
  pendingInvites: InviteRequest[];
  joinRequests: InviteRequest[];
  onSendInvite: (username: string) => void;
  onAcceptJoinRequest: (id: string) => void;
  onDeclineRequest: (id: string) => void;
}

function InviteCountdown({ timeoutAt }: { timeoutAt: number }) {
  const remaining = Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
  return (
    <span className="text-gray-500 text-[10px] flex items-center gap-0.5">
      <Clock className="w-2.5 h-2.5" />
      {remaining}s
    </span>
  );
}

export function CoHostInviteModal({
  open,
  onClose,
  pendingInvites,
  joinRequests,
  onSendInvite,
  onAcceptJoinRequest,
  onDeclineRequest,
}: CoHostInviteModalProps) {
  const [tab, setTab] = useState<"search" | "viewers">("search");
  const [searchInput, setSearchInput] = useState("");

  const handleSend = () => {
    const name = searchInput.trim().replace(/^@/, "");
    if (!name) return;
    onSendInvite(name);
    setSearchInput("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 p-0"
        style={{ background: "#0f0f0f", maxHeight: "85vh" }}
        data-ocid="cohost_invite.modal"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-base font-bold">
              Invite to Co-Host
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1a1a" }}
              data-ocid="cohost_invite.close.button"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Tab pills */}
          <div className="flex gap-2 mt-2">
            {(["search", "viewers"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                style={{
                  background: tab === t ? "#FF2D2D" : "#1a1a1a",
                  color: tab === t ? "#fff" : "#888",
                  border: `1px solid ${tab === t ? "#FF2D2D" : "#2a2a2a"}`,
                }}
                data-ocid={`cohost_invite.${t}.tab`}
              >
                {t}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div
          className="px-5 pb-8 overflow-y-auto"
          style={{ maxHeight: "65vh" }}
        >
          {/* Join Requests */}
          {joinRequests.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Join Requests
                </h3>
                <Badge
                  className="text-[9px] px-1.5 py-0.5"
                  style={{ background: "#FF2D2D", color: "white" }}
                >
                  {joinRequests.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                {joinRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "#111", border: "1px solid #222" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "#1e1e1e" }}
                      >
                        <span className="text-white text-xs font-bold">
                          {req.username[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white text-sm font-medium">
                        @{req.username}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptJoinRequest(req.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(34,197,94,0.2)" }}
                        data-ocid="cohost_invite.accept.button"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-green-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineRequest(req.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,45,45,0.2)" }}
                        data-ocid="cohost_invite.decline.button"
                      >
                        <UserX className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="my-4 h-px" style={{ background: "#1e1e1e" }} />
            </div>
          )}

          {tab === "search" && (
            <div>
              {/* Search input */}
              <div className="flex gap-2 mb-5">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="@username"
                  data-ocid="cohost_invite.search.input"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                  }}
                />
                <Button
                  onClick={handleSend}
                  size="sm"
                  className="px-4 rounded-xl font-semibold"
                  style={{
                    background: "#FF2D2D",
                    border: "none",
                    color: "white",
                  }}
                  data-ocid="cohost_invite.send.button"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Pending invites list */}
              {pendingInvites.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Sent Invites
                  </h4>
                  {pendingInvites.map((inv) => (
                    <motion.div
                      key={inv.id}
                      layout
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{
                        background: "#111",
                        border: "1px solid #1e1e1e",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: "#1e1e1e" }}
                        >
                          <span className="text-white text-xs font-bold">
                            {inv.username[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white text-sm">
                          @{inv.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === "pending" && (
                          <InviteCountdown timeoutAt={inv.timeoutAt} />
                        )}
                        {inv.status === "accepted" && (
                          <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                            <Check className="w-3 h-3" /> Joined
                          </span>
                        )}
                        {inv.status === "declined" && (
                          <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                            <X className="w-3 h-3" /> Declined
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {pendingInvites.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-6">
                  Type a username above and tap Send to invite.
                </p>
              )}
            </div>
          )}

          {tab === "viewers" && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Active Viewers
              </h4>
              <div className="flex flex-col gap-2">
                {MOCK_VIEWERS.map((name, idx) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "#111", border: "1px solid #1e1e1e" }}
                    data-ocid={`cohost_invite.viewer.item.${idx + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "#1e1e1e" }}
                      >
                        {name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          @{name}
                        </p>
                        <p className="text-gray-600 text-[10px]">
                          {Math.floor(Math.random() * 900 + 100)} pts
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSendInvite(name);
                        setTab("search");
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(255,45,45,0.15)",
                        border: "1px solid rgba(255,45,45,0.3)",
                        color: "#FF6B6B",
                      }}
                      data-ocid={`cohost_invite.viewer.invite.button.${idx + 1}`}
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
