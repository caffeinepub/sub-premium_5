/**
 * useCoHostSystem — client-side co-hosting state management
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type LayoutMode = "solo" | "1v1" | "2v2" | "grid4";

export interface CoHost {
  username: string;
  avatarLetter: string;
  id: string;
}

export interface InviteRequest {
  id: string;
  username: string;
  timeoutAt: number;
  status: "pending" | "accepted" | "declined";
}

interface CoHostSystemState {
  pendingInvites: InviteRequest[];
  joinRequests: InviteRequest[];
  coHosts: CoHost[];
  layoutMode: LayoutMode;
}

interface CoHostSystemActions {
  sendInvite: (username: string) => void;
  acceptJoinRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  removeCoHost: (id: string) => void;
  simulateViewerJoinRequest: () => void;
  acceptInvite: (id: string) => void;
}

function deriveLayout(coHostCount: number): LayoutMode {
  if (coHostCount === 0) return "solo";
  if (coHostCount === 1) return "1v1";
  if (coHostCount === 2) return "2v2";
  return "grid4";
}

const VIEWER_NAMES = [
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
  "mike_f",
  "anna_k",
  "leo_b",
  "sara_p",
  "kai_w",
];

export function useCoHostSystem(): CoHostSystemState & CoHostSystemActions {
  const [pendingInvites, setPendingInvites] = useState<InviteRequest[]>([]);
  const [joinRequests, setJoinRequests] = useState<InviteRequest[]>([]);
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);

  const expireTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second — expire pending invites after 15s
  useEffect(() => {
    expireTimerRef.current = setInterval(() => {
      const now = Date.now();
      setPendingInvites((prev) =>
        prev.map((inv) =>
          inv.status === "pending" && now >= inv.timeoutAt
            ? { ...inv, status: "declined" }
            : inv,
        ),
      );
    }, 1000);
    return () => {
      if (expireTimerRef.current) clearInterval(expireTimerRef.current);
    };
  }, []);

  const sendInvite = useCallback((username: string) => {
    const inv: InviteRequest = {
      id: `inv-${Date.now()}-${username}`,
      username,
      timeoutAt: Date.now() + 15_000,
      status: "pending",
    };
    setPendingInvites((prev) => [...prev, inv]);

    // Simulate random accept/decline after 4-10s
    const delay = 4000 + Math.random() * 6000;
    const accepted = Math.random() > 0.35;
    setTimeout(() => {
      if (accepted) {
        setPendingInvites((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, status: "accepted" } : i)),
        );
        // Add to co-hosts (max 3)
        setCoHosts((prev) => {
          if (prev.length >= 3) return prev;
          const coHost: CoHost = {
            id: inv.id,
            username,
            avatarLetter: username[0]?.toUpperCase() ?? "?",
          };
          return [...prev, coHost];
        });
      } else {
        setPendingInvites((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, status: "declined" } : i)),
        );
      }
    }, delay);
  }, []);

  const acceptInvite = useCallback(
    (id: string) => {
      setPendingInvites((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "accepted" } : i)),
      );
      const invite = pendingInvites.find((i) => i.id === id);
      if (invite) {
        setCoHosts((prev) => {
          if (prev.length >= 3) return prev;
          return [
            ...prev,
            {
              id,
              username: invite.username,
              avatarLetter: invite.username[0]?.toUpperCase() ?? "?",
            },
          ];
        });
      }
    },
    [pendingInvites],
  );

  const acceptJoinRequest = useCallback((id: string) => {
    setJoinRequests((prev) => {
      const req = prev.find((r) => r.id === id);
      if (!req) return prev;
      setCoHosts((hosts) => {
        if (hosts.length >= 3) return hosts;
        return [
          ...hosts,
          {
            id,
            username: req.username,
            avatarLetter: req.username[0]?.toUpperCase() ?? "?",
          },
        ];
      });
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const declineRequest = useCallback((id: string) => {
    setJoinRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeCoHost = useCallback((id: string) => {
    setCoHosts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const simulateViewerJoinRequest = useCallback(() => {
    const name =
      VIEWER_NAMES[Math.floor(Math.random() * VIEWER_NAMES.length)] ?? "viewer";
    const req: InviteRequest = {
      id: `req-${Date.now()}`,
      username: name,
      timeoutAt: Date.now() + 30_000,
      status: "pending",
    };
    setJoinRequests((prev) => [...prev, req]);
  }, []);

  const layoutMode = deriveLayout(coHosts.length);

  return {
    pendingInvites,
    joinRequests,
    coHosts,
    layoutMode,
    sendInvite,
    acceptInvite,
    acceptJoinRequest,
    declineRequest,
    removeCoHost,
    simulateViewerJoinRequest,
  };
}
