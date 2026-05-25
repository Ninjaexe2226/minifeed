function getDom() {
  return {
    // Modal/Auth
    modal: document.getElementById("authModal"),
    modalTitle: document.getElementById("modalTitle"),
    mainActionBtn: document.getElementById("mainActionBtn"),
    toggleModeBtn: document.getElementById("toggleModeBtn"),
    toggleLink: document.getElementById("toggleLink"),
    errorMsg: document.getElementById("errorMsg"),
    usernameInput: document.getElementById("usernameInput"),
    passwordInput: document.getElementById("passwordInput"),

    // Feed
    composeSection: document.getElementById("composeSection"),
    postContent: document.getElementById("postContent"),
    submitPostBtn: document.getElementById("submitPostBtn"),
    feedContainer: document.getElementById("feedContainer"),
    emptyState: document.getElementById("emptyState"),

    // Nav
    navHome: document.getElementById("navHome"),
    navAlerts: document.getElementById("navAlerts"),
    navMessages: document.getElementById("navMessages"),
    navProfile: document.getElementById("navProfile"),

    // Views
    views: {
      home: document.getElementById("homeView"),
      alerts: document.getElementById("alertsView"),
      messages: document.getElementById("messagesView"),
      profile: document.getElementById("profileView"),
    },

    // Profile
    profileUsername: document.getElementById("profileUsername"),
    profileHandle: document.getElementById("profileHandle"),
    profileBio: document.getElementById("profileBio"),
    followingCount: document.getElementById("followingCount"),
    followersCount: document.getElementById("followersCount"),
    likesCount: document.getElementById("likesCount"),
    logoutBtn: document.getElementById("logoutBtn"),
    backToFeedBtn: document.getElementById("backToFeedBtn"),
    settingsTabBtn: document.getElementById("settingsTabBtn"),

    profileTabs: document.querySelectorAll(".tab-btn"),
    tabContents: {
      posts: document.getElementById("profilePosts"),
      likes: document.getElementById("profileLikes"),
      following: document.getElementById("profileFollowing"),
      followers: document.getElementById("profileFollowers"),
      settings: document.getElementById("profileSettings"),
    },

    // Messages
    newMessageUsername: document.getElementById("newMessageUsername"),
    newMessageContent: document.getElementById("newMessageContent"),
    sendNewMessageBtn: document.getElementById("sendNewMessageBtn"),

    conversationsList: document.getElementById("conversationsList"),
    chatView: document.getElementById("chatView"),
    chatWith: document.getElementById("chatWith"),
    backToListBtn: document.getElementById("backToListBtn"),
    messagesContainer: document.getElementById("messagesContainer"),
    chatInput: document.getElementById("chatInput"),
    sendChatBtn: document.getElementById("sendChatBtn"),
    noMessages: document.getElementById("noMessages"),
  };
}
