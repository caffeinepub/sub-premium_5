import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
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

  // ------------------------------------------------
  // LIVE STREAMING SYSTEM
  // ------------------------------------------------

  public type LiveStream = {
    id : Nat;
    creatorId : Principal;
    title : Text;
    description : Text;
    category : Text;
    tags : [Text];
    privacy : Text;
    status : Text;
    viewerCount : Nat;
    peakViewers : Nat;
    totalLikes : Nat;
    totalGifts : Nat;
    totalRevenue : Nat;
    newFollowers : Nat;
    chatEnabled : Bool;
    replayEnabled : Bool;
    monetizationEnabled : Bool;
    startedAt : Int;
    endedAt : ?Int;
    scheduledAt : ?Int;
  };

  let liveStreams = Map.empty<Nat, LiveStream>();
  var liveStreamCounter : Nat = 0;

  public shared ({ caller }) func createLiveStream(
    title : Text,
    description : Text,
    category : Text,
    tags : [Text],
    privacy : Text,
    chatEnabled : Bool,
    replayEnabled : Bool,
    monetizationEnabled : Bool,
    scheduledAt : ?Int
  ) : async Nat {
    checkAuthenticatedUser(caller);

    let newStream : LiveStream = {
      id = liveStreamCounter;
      creatorId = caller;
      title;
      description;
      category;
      tags;
      privacy;
      status = "setup";
      viewerCount = 0;
      peakViewers = 0;
      totalLikes = 0;
      totalGifts = 0;
      totalRevenue = 0;
      newFollowers = 0;
      chatEnabled;
      replayEnabled;
      monetizationEnabled;
      startedAt = Time.now();
      endedAt = null;
      scheduledAt;
    };

    liveStreams.add(liveStreamCounter, newStream);
    let id = liveStreamCounter;
    liveStreamCounter += 1;
    id;
  };

  public query ({ caller }) func getLiveStream(id : Nat) : async ?LiveStream {
    switch (liveStreams.get(id)) {
      case (null) { null };
      case (?stream) {
        // Check privacy settings
        if (stream.privacy == "private") {
          // Only creator and admins can view private streams
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Runtime.trap("Unauthorized: This is a private stream");
          };
        } else if (stream.privacy == "subscribers_only") {
          // Check if caller is subscribed to creator or is the creator/admin
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            let subscriptions = getSubscriptionsSet(caller);
            if (not subscriptions.contains(stream.creatorId)) {
              Runtime.trap("Unauthorized: This stream is for subscribers only");
            };
          };
        };
        // Public streams can be viewed by anyone
        ?stream;
      };
    };
  };

  public query ({ caller }) func listActiveLiveStreams() : async [LiveStream] {
    // Public access - but filter based on privacy
    let allActive = liveStreams.values().filter(func(s) { s.status == "live" }).toArray();

    // Filter based on caller's permissions
    allActive.filter(func(stream) {
      if (stream.privacy == "public") {
        true;
      } else if (stream.privacy == "subscribers_only") {
        // Show if caller is creator, admin, or subscriber
        stream.creatorId == caller or
        AccessControl.isAdmin(accessControlState, caller) or
        getSubscriptionsSet(caller).contains(stream.creatorId);
      } else {
        // Private - only show to creator and admins
        stream.creatorId == caller or AccessControl.isAdmin(accessControlState, caller);
      };
    });
  };

  public query ({ caller }) func listAllLiveStreams() : async [LiveStream] {
    checkAuthenticatedUser(caller);

    // Filter based on privacy settings
    liveStreams.values().toArray().filter(func(stream) {
      if (stream.privacy == "public") {
        true;
      } else if (stream.privacy == "subscribers_only") {
        stream.creatorId == caller or
        AccessControl.isAdmin(accessControlState, caller) or
        getSubscriptionsSet(caller).contains(stream.creatorId);
      } else {
        stream.creatorId == caller or AccessControl.isAdmin(accessControlState, caller);
      };
    });
  };

  public shared ({ caller }) func updateLiveStreamStatus(id : Nat, status : Text) : async () {
    checkAuthenticatedUser(caller);
    let stream = getStreamOrTrap(id, caller);
    if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only creator or admin can update status");
    };
    let updatedStream = { stream with status };
    liveStreams.add(id, updatedStream);
  };

  public shared ({ caller }) func endLiveStream(id : Nat) : async () {
    checkAuthenticatedUser(caller);
    let stream = getStreamOrTrap(id, caller);
    if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only creator or admin can end stream");
    };
    let updatedStream = {
      stream with status = "ended";
      endedAt = ?Time.now();
    };
    liveStreams.add(id, updatedStream);
  };

  public shared ({ caller }) func incrementLiveViewers(id : Nat) : async () {
    checkAuthenticatedUser(caller);

    // Verify caller has access to this stream
    switch (liveStreams.get(id)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) {
        // Check privacy before allowing viewer increment
        if (stream.privacy == "private" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot view private stream");
        };
        if (stream.privacy == "subscribers_only" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          let subscriptions = getSubscriptionsSet(caller);
          if (not subscriptions.contains(stream.creatorId)) {
            Runtime.trap("Unauthorized: Must be subscribed to view this stream");
          };
        };

        let updatedStream = {
          stream with
          viewerCount = stream.viewerCount + 1;
          peakViewers = if (stream.viewerCount + 1 > stream.peakViewers) {
            stream.viewerCount + 1;
          } else {
            stream.peakViewers;
          };
        };
        liveStreams.add(id, updatedStream);
      };
    };
  };

  public shared ({ caller }) func decrementLiveViewers(id : Nat) : async () {
    checkAuthenticatedUser(caller);
    switch (liveStreams.get(id)) {
      case (?stream) {
        let updatedStream = {
          stream with
          viewerCount = if (stream.viewerCount > 0) { stream.viewerCount - 1 } else {
            0;
          };
        };
        liveStreams.add(id, updatedStream);
      };
      case (null) { Runtime.trap("Live stream not found") };
    };
  };

  public shared ({ caller }) func likeLiveStream(id : Nat) : async () {
    checkAuthenticatedUser(caller);

    // Verify caller has access to this stream
    switch (liveStreams.get(id)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) {
        // Check privacy before allowing like
        if (stream.privacy == "private" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot like private stream");
        };
        if (stream.privacy == "subscribers_only" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          let subscriptions = getSubscriptionsSet(caller);
          if (not subscriptions.contains(stream.creatorId)) {
            Runtime.trap("Unauthorized: Must be subscribed to like this stream");
          };
        };

        let updatedStream = {
          stream with totalLikes = stream.totalLikes + 1;
        };
        liveStreams.add(id, updatedStream);
      };
    };
  };

  public query ({ caller }) func getMyLiveStreams() : async [LiveStream] {
    checkAuthenticatedUser(caller);
    liveStreams.values().filter(func(s) { s.creatorId == caller }).toArray();
  };

  // ------------ Live Chat Messages -------------

  public type LiveChatMessage = {
    id : Nat;
    streamId : Nat;
    sender : Principal;
    senderUsername : Text;
    text : Text;
    messageType : Text;
    timestamp : Int;
  };

  let chatMessages = Map.empty<Nat, List.List<LiveChatMessage>>();
  var chatMessageCounter : Nat = 0;

  public shared ({ caller }) func sendChatMessage(
    streamId : Nat,
    text : Text,
    messageType : Text
  ) : async Nat {
    checkAuthenticatedUser(caller);

    // Verify stream exists and chat is enabled
    let stream = getStreamOrTrap(streamId, caller);
    if (not stream.chatEnabled) {
      Runtime.trap("Chat is disabled for this stream");
    };

    // Check privacy - only allowed viewers can send messages
    if (stream.privacy == "private" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Cannot chat in private stream");
    };
    if (stream.privacy == "subscribers_only" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      let subscriptions = getSubscriptionsSet(caller);
      if (not subscriptions.contains(stream.creatorId)) {
        Runtime.trap("Unauthorized: Must be subscribed to chat in this stream");
      };
    };

    let username = switch (userProfiles.get(caller)) {
      case (null) { "Guest" };
      case (?profile) { profile.username };
    };

    let newMessage : LiveChatMessage = {
      id = chatMessageCounter;
      streamId;
      sender = caller;
      senderUsername = username;
      text;
      messageType;
      timestamp = Time.now();
    };

    let messagesList = getChatMessageList(streamId);
    messagesList.add(newMessage);
    chatMessages.add(streamId, messagesList);

    let id = chatMessageCounter;
    chatMessageCounter += 1;
    id;
  };

  public query ({ caller }) func getChatMessages(streamId : Nat) : async [LiveChatMessage] {
    // Verify caller has access to view this stream's chat
    switch (liveStreams.get(streamId)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) {
        // Check privacy settings
        if (stream.privacy == "private") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Runtime.trap("Unauthorized: Cannot view chat of private stream");
          };
        } else if (stream.privacy == "subscribers_only") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            let subscriptions = getSubscriptionsSet(caller);
            if (not subscriptions.contains(stream.creatorId)) {
              Runtime.trap("Unauthorized: Must be subscribed to view chat");
            };
          };
        };

        getChatMessageList(streamId).toArray();
      };
    };
  };

  public shared ({ caller }) func pinChatMessage(streamId : Nat, messageId : Nat) : async () {
    checkAuthenticatedUser(caller);
    let stream = getStreamOrTrap(streamId, caller);
    if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only creator or admin can pin messages");
    };

    let messagesList = getChatMessageList(streamId);
    let mappedMessages = messagesList.toArray().map(
      func(msg) {
        if (msg.id == messageId) {
          { msg with messageType = "pinned" };
        } else {
          msg;
        };
      }
    );
    chatMessages.add(streamId, List.fromArray<LiveChatMessage>(mappedMessages));
  };

  public shared ({ caller }) func deleteChatMessage(streamId : Nat, messageId : Nat) : async () {
    checkAuthenticatedUser(caller);
    let stream = getStreamOrTrap(streamId, caller);
    if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only creator or admin can delete messages");
    };

    let messagesList = getChatMessageList(streamId);
    let filteredMessages = messagesList.filter(func(msg) { msg.id != messageId });
    chatMessages.add(streamId, filteredMessages);
  };

  func getChatMessageList(streamId : Nat) : List.List<LiveChatMessage> {
    switch (chatMessages.get(streamId)) {
      case (null) { List.empty<LiveChatMessage>() };
      case (?list) { list };
    };
  };

  // ------------ Live Gifts -------------

  public type LiveGift = {
    id : Nat;
    streamId : Nat;
    sender : Principal;
    senderUsername : Text;
    giftType : Text;
    coinValue : Nat;
    timestamp : Int;
  };

  let liveGifts = Map.empty<Nat, List.List<LiveGift>>();
  var liveGiftCounter : Nat = 0;

  public shared ({ caller }) func sendLiveGift(
    streamId : Nat,
    giftType : Text,
    coinValue : Nat
  ) : async Nat {
    checkAuthenticatedUser(caller);

    // Verify stream exists and monetization is enabled
    let stream = getStreamOrTrap(streamId, caller);
    if (not stream.monetizationEnabled) {
      Runtime.trap("Monetization is disabled for this stream");
    };

    // Check privacy - only allowed viewers can send gifts
    if (stream.privacy == "private" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Cannot send gifts to private stream");
    };
    if (stream.privacy == "subscribers_only" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      let subscriptions = getSubscriptionsSet(caller);
      if (not subscriptions.contains(stream.creatorId)) {
        Runtime.trap("Unauthorized: Must be subscribed to send gifts");
      };
    };

    let username = switch (userProfiles.get(caller)) {
      case (null) { "Guest" };
      case (?profile) { profile.username };
    };

    // Deduct coins from sender's balance
    spendCoinsInternal(caller, coinValue);

    let newGift : LiveGift = {
      id = liveGiftCounter;
      streamId;
      sender = caller;
      senderUsername = username;
      giftType;
      coinValue;
      timestamp = Time.now();
    };

    let giftsList = getLiveGiftList(streamId);
    giftsList.add(newGift);
    liveGifts.add(streamId, giftsList);

    // Update stream totalGifts and totalRevenue
    updateStreamRewards(streamId, coinValue);

    let id = liveGiftCounter;
    liveGiftCounter += 1;
    id;
  };

  func updateStreamRewards(streamId : Nat, amount : Nat) {
    switch (liveStreams.get(streamId)) {
      case (?stream) {
        let updatedStream = {
          stream with
          totalGifts = stream.totalGifts + amount;
          totalRevenue = stream.totalRevenue + amount;
        };
        liveStreams.add(streamId, updatedStream);
      };
      case (null) { Runtime.trap("Live stream not found") };
    };
  };

  public query ({ caller }) func getLiveGifts(streamId : Nat) : async [LiveGift] {
    // Verify caller has access to view this stream's gifts
    switch (liveStreams.get(streamId)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) {
        // Check privacy settings
        if (stream.privacy == "private") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Runtime.trap("Unauthorized: Cannot view gifts of private stream");
          };
        } else if (stream.privacy == "subscribers_only") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            let subscriptions = getSubscriptionsSet(caller);
            if (not subscriptions.contains(stream.creatorId)) {
              Runtime.trap("Unauthorized: Must be subscribed to view gifts");
            };
          };
        };

        getLiveGiftList(streamId).toArray();
      };
    };
  };

  public query ({ caller }) func getGiftLeaderboard(streamId : Nat) : async [LiveGift] {
    // Verify caller has access to view this stream's leaderboard
    switch (liveStreams.get(streamId)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) {
        // Check privacy settings
        if (stream.privacy == "private") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Runtime.trap("Unauthorized: Cannot view leaderboard of private stream");
          };
        } else if (stream.privacy == "subscribers_only") {
          if (stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            let subscriptions = getSubscriptionsSet(caller);
            if (not subscriptions.contains(stream.creatorId)) {
              Runtime.trap("Unauthorized: Must be subscribed to view leaderboard");
            };
          };
        };

        getLiveGiftList(streamId).toArray();
      };
    };
  };

  func getLiveGiftList(streamId : Nat) : List.List<LiveGift> {
    switch (liveGifts.get(streamId)) {
      case (null) { List.empty<LiveGift>() };
      case (?list) { list };
    };
  };

  // ------------ UserCoins System -------------

  public type UserCoins = {
    balance : Nat;
  };

  let userCoins = Map.empty<Principal, Nat>();

  public query ({ caller }) func getCoinBalance() : async Nat {
    checkAuthenticatedUser(caller);
    getUserBalance(caller);
  };

  public shared ({ caller }) func addCoins(amount : Nat) : async () {
    checkAuthenticatedUser(caller);
    let currentBalance = getUserBalance(caller);
    userCoins.add(caller, currentBalance + amount);
  };

  func spendCoinsInternal(user : Principal, amount : Nat) {
    let currentBalance = getUserBalance(user);
    if (currentBalance < amount) {
      Runtime.trap("Insufficient coins");
    };
    userCoins.add(user, currentBalance - amount);
  };

  public shared ({ caller }) func spendCoins(streamId : Nat, amount : Nat) : async () {
    checkAuthenticatedUser(caller);

    // Verify stream exists
    let stream = getStreamOrTrap(streamId, caller);

    // Verify caller has access to this stream
    if (stream.privacy == "private" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Cannot spend coins on private stream");
    };
    if (stream.privacy == "subscribers_only" and stream.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      let subscriptions = getSubscriptionsSet(caller);
      if (not subscriptions.contains(stream.creatorId)) {
        Runtime.trap("Unauthorized: Must be subscribed to spend coins on this stream");
      };
    };

    let currentBalance = getUserBalance(caller);
    if (currentBalance < amount) {
      Runtime.trap("Insufficient coins");
    };
    userCoins.add(caller, currentBalance - amount);
    updateStreamRewards(streamId, amount);
  };

  func getUserBalance(user : Principal) : Nat {
    switch (userCoins.get(user)) {
      case (null) { 1000 }; // Default balance
      case (?balance) { balance };
    };
  };

  //-----------------------
  // Helper Functions
  //-----------------------

  func getStreamOrTrap(id : Nat, _ : Principal) : LiveStream {
    switch (liveStreams.get(id)) {
      case (null) { Runtime.trap("Live stream not found") };
      case (?stream) { stream };
    };
  };
};
