import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Playlist {
    id: bigint;
    owner: Principal;
    name: string;
    createdAt: bigint;
    videoIds: Array<bigint>;
}
export interface VideoPost {
    id: bigint;
    title: string;
    description: string;
    videoBlob: ExternalBlob;
    thumbnailBlob: ExternalBlob;
    timestamp: bigint;
    uploader: Principal;
}
export interface AiSearchEntry {
    timestamp: bigint;
    searchQuery: string;
}
export interface UserProfile {
    username: string;
}
export interface WatchHistoryEntry {
    watchedAt: bigint;
    videoId: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addVideoToPlaylist(playlistId: bigint, videoId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearAiSearchHistory(): Promise<void>;
    clearWatchHistory(): Promise<void>;
    createPlaylist(name: string): Promise<bigint>;
    createVideoPost(title: string, description: string, videoBlob: ExternalBlob, thumbnailBlob: ExternalBlob): Promise<bigint>;
    deletePlaylist(id: bigint): Promise<void>;
    deleteVideoPost(id: bigint): Promise<void>;
    followCreator(creator: Principal): Promise<void>;
    getAiSearchHistory(): Promise<Array<AiSearchEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPlaylist(id: bigint): Promise<Playlist | null>;
    getSavedVideos(): Promise<Array<bigint>>;
    getSubscriptions(): Promise<Array<Principal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsername(): Promise<string | null>;
    getUsernameByPrincipal(principal: Principal): Promise<string | null>;
    getVideoPost(id: bigint): Promise<VideoPost | null>;
    getWatchHistory(): Promise<Array<WatchHistoryEntry>>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(creator: Principal): Promise<boolean>;
    isPremium(): Promise<boolean>;
    listMyPlaylists(): Promise<Array<Playlist>>;
    listVideoPosts(): Promise<Array<VideoPost>>;
    recordWatchHistory(videoId: bigint): Promise<void>;
    removeVideoFromPlaylist(playlistId: bigint, videoId: bigint): Promise<void>;
    renamePlaylist(id: bigint, name: string): Promise<void>;
    saveAiSearchHistory(searchQuery: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveVideo(videoId: bigint): Promise<void>;
    setUsername(username: string): Promise<void>;
    unfollowCreator(creator: Principal): Promise<void>;
    unsaveVideo(videoId: bigint): Promise<void>;
}
