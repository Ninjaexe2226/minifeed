const state = {
  isLogin: true,
  currentUser: null, // { id, username }
  viewedUser: null, // { id, username } o null
  posts: [],

  currentConversationId: null,
  currentChatPartner: null,
  messagesSubscription: null,
};
