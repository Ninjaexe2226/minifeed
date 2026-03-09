document.addEventListener("DOMContentLoaded", async () => {
  const dom = getDom();

  const onUsernameClick = async (userId, username) => {
    const loaders = makeProfileLoaders(state, dom, {
      onUsernameClick,
      onDelete,
    });
    await viewProfile(state, dom, userId, username, loaders);
  };

  const onDelete = async (postId) => {
    await deletePost(postId);
    await loadPosts(state, dom, { onUsernameClick, onDelete });
  };

  const loaders = makeProfileLoaders(state, dom, { onUsernameClick, onDelete });
  initProfileTabs(state, dom, loaders);

  // Auth events
  dom.toggleModeBtn?.addEventListener("click", () =>
    switchAuthMode(state, dom),
  );
  dom.toggleLink?.addEventListener("click", () => switchAuthMode(state, dom));
  dom.mainActionBtn?.addEventListener("click", async () => {
    await handleAuth(state, dom);
    if (state.currentUser) {
      await loadPosts(state, dom, { onUsernameClick, onDelete });
      showView(dom, "home");
    }
  });

  // Post
  dom.submitPostBtn?.addEventListener("click", async () => {
    if (!state.currentUser) return;
    const content = dom.postContent.value.trim();
    if (!content) return;

    await savePost(state, content);
    dom.postContent.value = "";
    await loadPosts(state, dom, { onUsernameClick, onDelete });
  });

  // Nav
  dom.navHome?.addEventListener("click", async () => {
    teardownMessagesRealtime(state);
    showView(dom, "home");
  });

  dom.navAlerts?.addEventListener("click", () => {
    teardownMessagesRealtime(state);
    showView(dom, "alerts");
  });

  dom.navMessages?.addEventListener("click", async () => {
    showView(dom, "messages");
    await loadConversations(state, dom);
  });

  dom.navProfile?.addEventListener("click", async () => {
    teardownMessagesRealtime(state);
    const myId = state.currentUser?.id;
    const myName = state.currentUser?.username;
    if (!myId) return showView(dom, "home");

    await viewProfile(state, dom, myId, myName, loaders);
  });

  // Profile controls
  dom.logoutBtn?.addEventListener("click", () => logout(dom));

  dom.backToFeedBtn?.addEventListener("click", async () => {
    state.viewedUser = null;
    setHidden(dom.backToFeedBtn, true);
    showView(dom, "home");
    await loadPosts(state, dom, { onUsernameClick, onDelete });
  });

  // Messages controls
  dom.backToListBtn?.addEventListener("click", async () => {
    teardownMessagesRealtime(state);
    state.currentConversationId = null;
    setHidden(dom.chatView, true);
    setHidden(dom.conversationsList, false);
    await loadConversations(state, dom);
  });

  dom.sendChatBtn?.addEventListener("click", async () => {
    await sendChatMessage(state, dom);
  });

  dom.sendNewMessageBtn?.addEventListener("click", async () => {
    await sendFirstMessage(state, dom);
  });

  // Auto-login
  await autoLogin(state, dom, async () => {
    await loadPosts(state, dom, { onUsernameClick, onDelete });
    showView(dom, "home");
  });
});
