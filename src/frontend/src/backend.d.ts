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
export interface UserProfile {
    username: string;
}
export interface AiSearchEntry {
    timestamp: bigint;
    searchQuery: string;
}
export interface Playlist {
    id: bigint;
    owner: Principal;
    name: string;
    createdAt: bigint;
    videoIds: Array<bigint>;
}
export interface LiveGift {
    id: bigint;
    coinValue: bigint;
    senderUsername: string;
    sender: Principal;
    streamId: bigint;
    timestamp: bigint;
    giftType: string;
}
export interface ExtendedProfile {
    bio: string;
    username: string;
    expiryDate?: string;
    name: string;
    cardholderName?: string;
    avatarUrl?: string;
    maskedCardNumber?: string;
}
export interface WatchHistoryEntry {
    watchedAt: bigint;
    videoId: bigint;
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
export interface LiveChatMessage {
    id: bigint;
    text: string;
    senderUsername: string;
    sender: Principal;
    messageType: string;
    streamId: bigint;
    timestamp: bigint;
}
export interface LiveStream {
    id: bigint;
    status: string;
    title: string;
    startedAt: bigint;
    monetizationEnabled: boolean;
    chatEnabled: boolean;
    endedAt?: bigint;
    tags: Array<string>;
    creatorId: Principal;
    description: string;
    totalLikes: bigint;
    peakViewers: bigint;
    privacy: string;
    totalGifts: bigint;
    category: string;
    replayEnabled: boolean;
    totalRevenue: bigint;
    newFollowers: bigint;
    viewerCount: bigint;
    scheduledAt?: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCoins(amount: bigint): Promise<void>;
    addVideoToPlaylist(playlistId: bigint, videoId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkUsernameAvailable(username: string): Promise<boolean>;
    clearAiSearchHistory(): Promise<void>;
    clearWatchHistory(): Promise<void>;
    createLiveStream(title: string, description: string, category: string, tags: Array<string>, privacy: string, chatEnabled: boolean, replayEnabled: boolean, monetizationEnabled: boolean, scheduledAt: bigint | null): Promise<bigint>;
    createPlaylist(name: string): Promise<bigint>;
    createVideoPost(title: string, description: string, videoBlob: ExternalBlob, thumbnailBlob: ExternalBlob): Promise<bigint>;
    decrementLiveViewers(id: bigint): Promise<void>;
    deleteChatMessage(streamId: bigint, messageId: bigint): Promise<void>;
    deletePlaylist(id: bigint): Promise<void>;
    deleteVideoPost(id: bigint): Promise<void>;
    endLiveStream(id: bigint): Promise<void>;
    followCreator(creator: Principal): Promise<void>;
    getAiSearchHistory(): Promise<Array<AiSearchEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatMessages(streamId: bigint): Promise<Array<LiveChatMessage>>;
    getCoinBalance(): Promise<bigint>;
    getExtendedProfile(): Promise<ExtendedProfile | null>;
    getGiftLeaderboard(streamId: bigint): Promise<Array<LiveGift>>;
    getLiveGifts(streamId: bigint): Promise<Array<LiveGift>>;
    getLiveStream(id: bigint): Promise<LiveStream | null>;
    getMyLiveStreams(): Promise<Array<LiveStream>>;
    getPlaylist(id: bigint): Promise<Playlist | null>;
    getSavedVideos(): Promise<Array<bigint>>;
    getSubscriptions(): Promise<Array<Principal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsername(): Promise<string | null>;
    getUsernameByPrincipal(principal: Principal): Promise<string | null>;
    getVideoPost(id: bigint): Promise<VideoPost | null>;
    getWatchHistory(): Promise<Array<WatchHistoryEntry>>;
    incrementLiveViewers(id: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(creator: Principal): Promise<boolean>;
    isPremium(): Promise<boolean>;
    likeLiveStream(id: bigint): Promise<void>;
    listActiveLiveStreams(): Promise<Array<LiveStream>>;
    listAllLiveStreams(): Promise<Array<LiveStream>>;
    listMyPlaylists(): Promise<Array<Playlist>>;
    listVideoPosts(): Promise<Array<VideoPost>>;
    pinChatMessage(streamId: bigint, messageId: bigint): Promise<void>;
    recordWatchHistory(videoId: bigint): Promise<void>;
    removeVideoFromPlaylist(playlistId: bigint, videoId: bigint): Promise<void>;
    renamePlaylist(id: bigint, name: string): Promise<void>;
    saveAiSearchHistory(searchQuery: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveExtendedProfile(profile: ExtendedProfile): Promise<void>;
    saveVideo(videoId: bigint): Promise<void>;
    sendChatMessage(streamId: bigint, text: string, messageType: string): Promise<bigint>;
    sendLiveGift(streamId: bigint, giftType: string, coinValue: bigint): Promise<bigint>;
    setUsername(username: string): Promise<void>;
    spendCoins(streamId: bigint, amount: bigint): Promise<void>;
    unfollowCreator(creator: Principal): Promise<void>;
    unsaveVideo(videoId: bigint): Promise<void>;
    updateLiveStreamStatus(id: bigint, status: string): Promise<void>;
}
