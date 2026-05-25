document.addEventListener("DOMContentLoaded", async () => {
  const dom = getDom();

  // 1. Callbacks independientes
  const onUsernameClick = async (userId, username) => {
    const loaders = makeProfileLoaders(state, dom, callbacks);
    await viewProfile(state, dom, userId, username, loaders);
  };

  const onDelete = async (postId) => {
    await deletePost(postId);
    const activeTab = document.querySelector('.profile-tab.active')?.dataset.tab;
    if (activeTab && loaders[activeTab]) {
      await loaders[activeTab]();
    } else {
      await loadPosts(state, dom, callbacks);
    }
  };

  const onLikeToggle = async () => {
    const targetId = state.viewedUser?.id || state.currentUser?.id;
    if (targetId) {
      if (typeof loadProfileCounts === 'function') {
        await loadProfileCounts(dom, targetId);
      }
    }
    const activeTab = document.querySelector('.profile-tab.active')?.dataset.tab;
    if (activeTab === 'likes' && loaders.likes) {
      await loaders.likes();
    }
  };

  // 2. Objeto estructurado idéntico a la destructuración de postCard.js
  const callbacks = { state, onDelete, onUsernameClick, onLikeToggle };

  // 3. Inicializar los cargadores de pestañas
  const loaders = makeProfileLoaders(state, dom, callbacks);
  initProfileTabs(state, dom, loaders);

  // Auth events
  dom.toggleModeBtn?.addEventListener("click", () => switchAuthMode(state, dom));
  dom.toggleLink?.addEventListener("click", () => switchAuthMode(state, dom));
  dom.mainActionBtn?.addEventListener("click", async () => {
    await handleAuth(state, dom);
    if (state.currentUser) {
      await loadPosts(state, dom, callbacks);
      showView(dom, "home");
    }
  });

  // Submit Post
  dom.submitPostBtn?.addEventListener("click", async () => {
    if (!state.currentUser) return;
    const content = dom.postContent.value.trim();
    if (!content) return;

    await savePost(state, content);
    dom.postContent.value = "";
    await loadPosts(state, dom, callbacks);
  });

  // Navigation
  dom.navHome?.addEventListener("click", async () => {
    teardownMessagesRealtime(state);
    showView(dom, "home");
    await loadPosts(state, dom, callbacks);
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

  // Profile and Back controls
  dom.logoutBtn?.addEventListener("click", () => logout(dom));

  dom.backToFeedBtn?.addEventListener("click", async () => {
    state.viewedUser = null;
    setHidden(dom.backToFeedBtn, true);
    showView(dom, "home");
    await loadPosts(state, dom, callbacks);
  });

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

  // Auto-login inicial
  await autoLogin(state, dom, async () => {
    await loadPosts(state, dom, callbacks);
    showView(dom, "home");
  });
});