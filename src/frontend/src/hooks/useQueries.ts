import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExternalBlob } from "../backend";
import {
  fetchEngagement,
  recordView,
  toggleLike,
} from "../utils/videoEngagement";
import { useActor } from "./useActor";

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUsername() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["username"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getUsername();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetUsername() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setUsername(username);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["username"] });
      void queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setUsername(username);
      await actor.saveCallerUserProfile({ username });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["username"] });
      void queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export function useListVideoPosts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["videoPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listVideoPosts();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateVideoPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      videoBlob,
      thumbnailBlob,
    }: {
      title: string;
      description: string;
      videoBlob: ExternalBlob;
      thumbnailBlob: ExternalBlob;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createVideoPost(
        title,
        description,
        videoBlob,
        thumbnailBlob,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["videoPosts"] });
    },
  });
}

export function useDeleteVideoPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteVideoPost(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["videoPosts"] });
    },
  });
}

// ─── Username by Principal ───────────────────────────────────────────────────

import type { Principal } from "@icp-sdk/core/principal";

export function useGetUsernameByPrincipal(principal: Principal | undefined) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["usernameByPrincipal", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUsernameByPrincipal(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export function useListMyPlaylists() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["myPlaylists"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyPlaylists();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreatePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createPlaylist(name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myPlaylists"] });
    },
  });
}

export function useRenamePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: bigint; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.renamePlaylist(id, name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myPlaylists"] });
    },
  });
}

export function useDeletePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deletePlaylist(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myPlaylists"] });
    },
  });
}

export function useAddVideoToPlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playlistId,
      videoId,
    }: {
      playlistId: bigint;
      videoId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addVideoToPlaylist(playlistId, videoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myPlaylists"] });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playlistId,
      videoId,
    }: {
      playlistId: bigint;
      videoId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.removeVideoFromPlaylist(playlistId, videoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myPlaylists"] });
    },
  });
}

// ─── Watch History ────────────────────────────────────────────────────────────

export function useGetWatchHistory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["watchHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWatchHistory();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRecordWatchHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.recordWatchHistory(videoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["watchHistory"] });
    },
  });
}

export function useClearWatchHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.clearWatchHistory();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["watchHistory"] });
    },
  });
}

// ─── Saved Videos ─────────────────────────────────────────────────────────────

export function useGetSavedVideos() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["savedVideos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSavedVideos();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSaveVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveVideo(videoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["savedVideos"] });
    },
  });
}

export function useUnsaveVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unsaveVideo(videoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["savedVideos"] });
    },
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function useGetSubscriptions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSubscriptions();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useFollowCreator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creator: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followCreator(creator);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

export function useUnfollowCreator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creator: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowCreator(creator);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

// ─── AI Search History ───────────────────────────────────────────────────────

export function useGetAiSearchHistory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["aiSearchHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAiSearchHistory();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSaveAiSearchHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (searchQuery: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveAiSearchHistory(searchQuery);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["aiSearchHistory"] });
    },
  });
}

export function useClearAiSearchHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.clearAiSearchHistory();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["aiSearchHistory"] });
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Is Following ─────────────────────────────────────────────────────────────

export function useIsFollowing(creator: Principal | undefined) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["isFollowing", creator?.toString()],
    queryFn: async () => {
      if (!actor || !creator) return false;
      return actor.isFollowing(creator);
    },
    enabled: !!actor && !actorFetching && !!creator,
  });
}

// ─── Premium ──────────────────────────────────────────────────────────────────

export function useIsPremium() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["isPremium"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isPremium();
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Extended Profile ─────────────────────────────────────────────────────────

export function useGetExtendedProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["extendedProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getExtendedProfile();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSaveExtendedProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: import("../backend.d").ExtendedProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveExtendedProfile(profile);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["extendedProfile"] });
      void queryClient.invalidateQueries({ queryKey: ["username"] });
      void queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useCheckUsernameAvailable() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.checkUsernameAvailable(username);
    },
  });
}

// ─── Video Engagement ─────────────────────────────────────────────────────────

/**
 * Fetches engagement data (views, likes, userLiked) for a video.
 * Starts with defaults, fetches in background with a 5-second timeout.
 * Never blocks rendering — returns { views: 0, likes: 0, userLiked: false }
 * on any error or timeout.
 */
export function useVideoEngagement(
  videoId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["videoEngagement", videoId, userId],
    queryFn: async () => {
      if (!videoId || !userId) return { views: 0, likes: 0, userLiked: false };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const result = await fetchEngagement(
          videoId,
          userId,
          controller.signal,
        );
        return result;
      } finally {
        clearTimeout(timer);
      }
    },
    enabled: !!videoId,
    staleTime: 0,
    gcTime: 30_000,
    retry: false,
  });
}

/**
 * Mutation that records a view for a video (deduped per 24h per user).
 * Fires non-blocking after the video page opens.
 */
export function useRecordVideoView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      userId,
    }: {
      videoId: string;
      userId: string;
    }) => {
      return recordView(videoId, userId);
    },
    onSuccess: (newViews, { videoId, userId }) => {
      queryClient.setQueryData(
        ["videoEngagement", videoId, userId],
        (
          old: { views: number; likes: number; userLiked: boolean } | undefined,
        ) =>
          old
            ? { ...old, views: newViews }
            : { views: newViews, likes: 0, userLiked: false },
      );
    },
  });
}

/**
 * Mutation that toggles the like status for a video.
 * Optimistically updates the React Query cache so the UI reflects the new
 * state immediately without re-fetching.
 */
export function useToggleVideoLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      userId,
    }: {
      videoId: string;
      userId: string;
    }) => {
      return toggleLike(videoId, userId);
    },
    onSuccess: (result, { videoId, userId }) => {
      queryClient.setQueryData(
        ["videoEngagement", videoId, userId],
        (
          old: { views: number; likes: number; userLiked: boolean } | undefined,
        ) =>
          old
            ? { ...old, likes: result.likeCount, userLiked: result.liked }
            : { views: 0, likes: result.likeCount, userLiked: result.liked },
      );
    },
  });
}
