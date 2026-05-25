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
// Carga inicial del listado de personas seguidas por el usuario logueado
async function loadMyFollowingList(state) {
  if (!state.currentUser) return;
  const { data, error } = await sb
    .from('follows')
    .select('followed_id')
    .eq('follower_id', state.currentUser.id);

  if (error) {
    console.error("Error loading following list:", error);
    state.followingIds = [];
    return;
  }
  state.followingIds = data.map(f => f.followed_id);
}

// Función centralizadora para el botón alternador de Follow / Unfollow
async function handleFollowToggle(state, targetUserId, currentlyFollowing) {
  if (!state.currentUser) {
    alert("You must be logged in to follow users!");
    return false;
  }

  try {
    if (currentlyFollowing) {
      const { error } = await sb
        .from('follows')
        .delete()
        .eq('follower_id', state.currentUser.id)
        .eq('followed_id', targetUserId);

      if (error) throw error;
      state.followingIds = state.followingIds.filter(id => id !== targetUserId);
    } else {
      const { error } = await sb
        .from('follows')
        .insert({
          follower_id: state.currentUser.id,
          followed_id: targetUserId
        });

      if (error) throw error;
      state.followingIds.push(targetUserId);
    }
    return true;
  } catch (err) {
    console.error("Follow operations error:", err);
    alert("Could not process follow request: " + err.message);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const dom = getDom();

  const onUsernameClick = async (userId, username) => {
    const loaders = makeProfileLoaders(state, dom, {
      onUsernameClick,
      onDelete,
    });
    // Pasamos el callback de follow a viewProfile para enlazarlo con la cabecera
    await viewProfile(state, dom, userId, username, loaders, (targetId, currentStatus) => {
      return handleFollowToggle(state, targetId, currentStatus);
    });
  };

  const onDelete = async (postId) => {
    await deletePost(postId);
    // El Realtime se encarga de redibujar automáticamente tras el borrado
  };

  const loaders = makeProfileLoaders(state, dom, { onUsernameClick, onDelete });
  initProfileTabs(state, dom, loaders);

  // Auth events
  dom.toggleModeBtn?.addEventListener("click", () => switchAuthMode(state, dom));
  dom.toggleLink?.addEventListener("click", () => switchAuthMode(state, dom));
  
  dom.mainActionBtn?.addEventListener("click", async () => {
    await handleAuth(state, dom);
    if (state.currentUser) {
      await loadMyFollowingList(state); 
      await loadPosts(state, dom, { onUsernameClick, onDelete });
      showView(dom, "home");
    }
  });

  // Post Submit
  dom.submitPostBtn?.addEventListener("click", async () => {
    if (!state.currentUser) return;
    const content = dom.postContent.value.trim();
    if (!content) return;

    await savePost(state, content);
    dom.postContent.value = "";
    // No hace falta loadPosts(), ¡El canal Realtime de feed.js inyecta el post al instante!
  });

  // Navigation Links
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

    await viewProfile(state, dom, myId, myName, loaders, (targetId, currentStatus) => {
      return handleFollowToggle(state, targetId, currentStatus);
    });
  });

  // Controls
  dom.logoutBtn?.addEventListener("click", () => logout(dom));

  dom.backToFeedBtn?.addEventListener("click", async () => {
    state.viewedUser = null;
    setHidden(dom.backToFeedBtn, true);
    showView(dom, "home");
    await loadPosts(state, dom, { onUsernameClick, onDelete });
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

  // Auto-login al refrescar
  await autoLogin(state, dom, async () => {
    await loadMyFollowingList(state); 
    await loadPosts(state, dom, { onUsernameClick, onDelete });
    showView(dom, "home");
  });
});
