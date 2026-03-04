import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Set "mo:core/Set";
import Text "mo:core/Text";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";



actor {
  // Initialize the access control state
  let accessControlState = AccessControl.initState();

  // Mixin components from prefabs folder
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // User profile type
  public type UserProfile = {
    username : Text;
  };

  public type ExtendedProfile = {
    name : Text;
    username : Text;
    bio : Text;
    avatarUrl : ?Text;
    cardholderName : ?Text;
    maskedCardNumber : ?Text;
    expiryDate : ?Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let extendedProfiles = Map.empty<Principal, ExtendedProfile>();

  // User profile operations
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveExtendedProfile(profile : ExtendedProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    if (profile.bio.size() > 160) {
      Runtime.trap("Bio must be 160 characters or less");
    };

    // Check if username is being changed and if so, verify it's available
    let currentExtendedProfile = extendedProfiles.get(caller);
    let currentUsername = switch (currentExtendedProfile) {
      case (?p) { ?p.username };
      case (null) { null };
    };

    // If username is different from current, check availability
    let usernameChanged = switch (currentUsername) {
      case (?current) { current != profile.username };
      case (null) { true };
    };

    if (usernameChanged) {
      // Check if username is taken by another user
      let usernameLower = profile.username.toLower();
      
      // Check in userProfiles
      for ((principal, userProfile) in userProfiles.entries()) {
        if (principal != caller and userProfile.username.toLower() == usernameLower) {
          Runtime.trap("Username already taken");
        };
      };

      // Check in extendedProfiles
      for ((principal, extProfile) in extendedProfiles.entries()) {
        if (principal != caller and extProfile.username.toLower() == usernameLower) {
          Runtime.trap("Username already taken");
        };
      };

      // Check in usernames map
      for ((principal, username) in usernames.entries()) {
        if (principal != caller and username.toLower() == usernameLower) {
          Runtime.trap("Username already taken");
        };
      };
    };

    extendedProfiles.add(caller, profile);
  };

  public query ({ caller }) func getExtendedProfile() : async ?ExtendedProfile {
    checkAuthenticatedUser(caller);
    extendedProfiles.get(caller);
  };

  public query ({ caller }) func checkUsernameAvailable(username : Text) : async Bool {
    // Public access - anyone including guests can check username availability
    // This is needed for registration/signup flows
    let usernameLower = username.toLower();
    
    // Check in userProfiles
    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username.toLower() == usernameLower) {
        return false;
      };
    };

    // Check in extendedProfiles
    for ((principal, profile) in extendedProfiles.entries()) {
      if (profile.username.toLower() == usernameLower) {
        return false;
      };
    };

    // Check in usernames map
    for ((principal, uname) in usernames.entries()) {
      if (uname.toLower() == usernameLower) {
        return false;
      };
    };

    true;
  };

  // Custom data
  type VideoPost = {
    id : Nat;
    title : Text;
    description : Text;
    videoBlob : Storage.ExternalBlob;
    thumbnailBlob : Storage.ExternalBlob;
    uploader : Principal;
    timestamp : Int;
  };

  module VideoPost {
    public func compareByTimestampDesc(post1 : VideoPost, post2 : VideoPost) : Order.Order {
      Int.compare(post2.timestamp, post1.timestamp);
    };
  };

  let videoPosts = Map.empty<Nat, VideoPost>();
  var videoPostCounter = 0;

  // Video post operations
  public shared ({ caller }) func createVideoPost(title : Text, description : Text, videoBlob : Storage.ExternalBlob, thumbnailBlob : Storage.ExternalBlob) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create video posts");
    };

    let newPost : VideoPost = {
      id = videoPostCounter;
      title;
      description;
      videoBlob;
      thumbnailBlob;
      uploader = caller;
      timestamp = Time.now();
    };

    videoPosts.add(videoPostCounter, newPost);
    videoPostCounter += 1;
    newPost.id;
  };

  public query ({ caller }) func getVideoPost(id : Nat) : async ?VideoPost {
    // Public access - anyone including guests can view video posts
    videoPosts.get(id);
  };

  public query ({ caller }) func listVideoPosts() : async [VideoPost] {
    // Public access - anyone including guests can list video posts
    let sortedPosts = videoPosts.values().toArray().sort(VideoPost.compareByTimestampDesc);
    sortedPosts;
  };

  public shared ({ caller }) func deleteVideoPost(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete video posts");
    };

    switch (videoPosts.get(id)) {
      case (null) { Runtime.trap("Video post not found") };
      case (?post) {
        if (post.uploader != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only uploader or admin can delete this post");
        };
        videoPosts.remove(id);
      };
    };
  };

  // ---------- Username management ----------

  let usernames = Map.empty<Principal, Text>();

  public shared ({ caller }) func setUsername(username : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set username");
    };
    usernames.add(caller, username);
  };

  public query ({ caller }) func getUsername() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their username");
    };
    usernames.get(caller);
  };

  public query ({ caller }) func getUsernameByPrincipal(principal : Principal) : async ?Text {
    // Public access - anyone can look up usernames by principal
    usernames.get(principal);
  };

  // ---------- Playlists ----------

  public type Playlist = {
    id : Nat;
    name : Text;
    owner : Principal;
    videoIds : [Nat];
    createdAt : Int;
  };

  let playlists = Map.empty<Nat, Playlist>();
  var playlistCounter = 0;

  public shared ({ caller }) func createPlaylist(name : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create playlists");
    };

    let newPlaylist : Playlist = {
      id = playlistCounter;
      name;
      owner = caller;
      videoIds = [];
      createdAt = Time.now();
    };

    playlists.add(playlistCounter, newPlaylist);
    let id = playlistCounter;
    playlistCounter += 1;
    id;
  };

  public shared ({ caller }) func renamePlaylist(id : Nat, name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rename playlists");
    };
    let playlist = getPlaylistOrTrapInternal(id, caller);
    let updatedPlaylist = { playlist with name };
    playlists.add(id, updatedPlaylist);
  };

  public shared ({ caller }) func deletePlaylist(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete playlists");
    };
    let _ = getPlaylistOrTrapInternal(id, caller); // Will trap if not owner
    playlists.remove(id);
  };

  public shared ({ caller }) func addVideoToPlaylist(playlistId : Nat, videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add videos to playlists");
    };
    let playlist = getPlaylistOrTrapInternal(playlistId, caller);
    let newVideoIds = playlist.videoIds.concat([videoId]);
    let updatedPlaylist = { playlist with videoIds = newVideoIds };
    playlists.add(playlistId, updatedPlaylist);
  };

  public shared ({ caller }) func removeVideoFromPlaylist(playlistId : Nat, videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove videos from playlists");
    };
    let playlist = getPlaylistOrTrapInternal(playlistId, caller);
    let newVideoIds = playlist.videoIds.filter(func(id) { id != videoId });
    let updatedPlaylist = { playlist with videoIds = newVideoIds };
    playlists.add(playlistId, updatedPlaylist);
  };

  public query ({ caller }) func listMyPlaylists() : async [Playlist] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be a user to list playlists");
    };
    playlists.values().filter(func(p) { p.owner == caller }).toArray();
  };

  public query ({ caller }) func getPlaylist(id : Nat) : async ?Playlist {
    switch (playlists.get(id)) {
      case (null) { null };
      case (?playlist) {
        // Only the owner or admin can view a playlist
        if (playlist.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only playlist owner or admin can view this playlist");
        };
        ?playlist;
      };
    };
  };

  func getPlaylistOrTrapInternal(id : Nat, caller : Principal) : Playlist {
    switch (playlists.get(id)) {
      case (null) { Runtime.trap("Playlist not found") };
      case (?playlist) {
        if (playlist.owner != caller) {
          Runtime.trap("Unauthorized: Only playlist owner can modify playlist");
        };
        playlist;
      };
    };
  };

  // ----------- Watch History -----------

  public type WatchHistoryEntry = {
    videoId : Nat;
    watchedAt : Int;
  };

  let userWatchHistory = Map.empty<Principal, List.List<WatchHistoryEntry>>();

  public shared ({ caller }) func recordWatchHistory(videoId : Nat) : async () {
    checkAuthenticatedUser(caller);
    let entry : WatchHistoryEntry = {
      videoId;
      watchedAt = Time.now();
    };

    let historyList = getWatchList(caller);
    historyList.add(entry);
    userWatchHistory.add(caller, historyList);
  };

  public query ({ caller }) func getWatchHistory() : async [WatchHistoryEntry] {
    checkAuthenticatedUser(caller);
    let historyList = getWatchList(caller);
    historyList.reverse().toArray();
  };

  public shared ({ caller }) func clearWatchHistory() : async () {
    checkAuthenticatedUser(caller);
    userWatchHistory.remove(caller);
  };

  func getWatchList(caller : Principal) : List.List<WatchHistoryEntry> {
    switch (userWatchHistory.get(caller)) {
      case (null) { List.empty<WatchHistoryEntry>() };
      case (?list) { list };
    };
  };

  // ----------- Saved Videos ------------

  let userSavedVideos = Map.empty<Principal, Set.Set<Nat>>();

  public shared ({ caller }) func saveVideo(videoId : Nat) : async () {
    checkAuthenticatedUser(caller);
    let savedVideos = getSavedVideosSet(caller);
    savedVideos.add(videoId);
    userSavedVideos.add(caller, savedVideos);
  };

  public shared ({ caller }) func unsaveVideo(videoId : Nat) : async () {
    checkAuthenticatedUser(caller);
    let savedVideos = getSavedVideosSet(caller);
    savedVideos.remove(videoId);
    userSavedVideos.add(caller, savedVideos);
  };

  public query ({ caller }) func getSavedVideos() : async [Nat] {
    checkAuthenticatedUser(caller);
    getSavedVideosSet(caller).toArray();
  };

  func getSavedVideosSet(caller : Principal) : Set.Set<Nat> {
    switch (userSavedVideos.get(caller)) {
      case (null) {
        Set.empty<Nat>();
      };
      case (?set) { set };
    };
  };

  // ----------- Subscriptions ------------

  let userSubscriptions = Map.empty<Principal, Set.Set<Principal>>();

  public shared ({ caller }) func followCreator(creator : Principal) : async () {
    checkAuthenticatedUser(caller);
    let subscriptions = getSubscriptionsSet(caller);
    subscriptions.add(creator);
    userSubscriptions.add(caller, subscriptions);
  };

  public shared ({ caller }) func unfollowCreator(creator : Principal) : async () {
    checkAuthenticatedUser(caller);
    let subscriptions = getSubscriptionsSet(caller);
    subscriptions.remove(creator);
    userSubscriptions.add(caller, subscriptions);
  };

  public query ({ caller }) func getSubscriptions() : async [Principal] {
    checkAuthenticatedUser(caller);
    getSubscriptionsSet(caller).toArray();
  };

  public query ({ caller }) func isFollowing(creator : Principal) : async Bool {
    checkAuthenticatedUser(caller);
    getSubscriptionsSet(caller).contains(creator);
  };

  func getSubscriptionsSet(caller : Principal) : Set.Set<Principal> {
    switch (userSubscriptions.get(caller)) {
      case (null) {
        Set.empty<Principal>();
      };
      case (?set) { set };
    };
  };

  // --- Checking Authenticated User ---

  func checkAuthenticatedUser(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can perform this action");
    };
  };

  // --- Premium Status (Stub) ---

  public query ({ caller }) func isPremium() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check premium status");
    };
    false;
  };

  // ------ AI Search History ------

  public type AiSearchEntry = {
    searchQuery : Text;
    timestamp : Int;
  };

  let aiSearchHistory = Map.empty<Principal, List.List<AiSearchEntry>>();

  public shared ({ caller }) func saveAiSearchHistory(searchQuery : Text) : async () {
    checkAuthenticatedUser(caller);
    let entry : AiSearchEntry = {
      searchQuery;
      timestamp = Time.now();
    };

    let historyList = getAiHistoryList(caller);
    historyList.add(entry);
    aiSearchHistory.add(caller, historyList);
  };

  public query ({ caller }) func getAiSearchHistory() : async [AiSearchEntry] {
    checkAuthenticatedUser(caller);
    let historyList = getAiHistoryList(caller);
    let reversedHistory = historyList.reverse().toArray();
    reversedHistory;
  };

  public shared ({ caller }) func clearAiSearchHistory() : async () {
    checkAuthenticatedUser(caller);
    aiSearchHistory.remove(caller);
  };

  func getAiHistoryList(caller : Principal) : List.List<AiSearchEntry> {
    switch (aiSearchHistory.get(caller)) {
      case (null) { List.empty<AiSearchEntry>() };
      case (?list) { list };
    };
  };
};
