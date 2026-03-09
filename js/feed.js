async function loadPosts(state, dom, { onUsernameClick, onDelete }) {
  if (!state.currentUser) return;

  const { data, error } = await sb
    .from("posts")
    .select(
      `id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin)`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading posts:", error);
    return;
  }

  state.posts = data || [];
  renderFeed(state, dom, { onUsernameClick, onDelete });
}

function renderFeed(state, dom, { onUsernameClick, onDelete }) {
  dom.feedContainer.innerHTML = "";

  if (!state.posts.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "empty-feed";
    placeholder.textContent = state.currentUser
      ? "Your space is quiet... share something? 🌌"
      : "Log in to start posting";
    dom.feedContainer.appendChild(placeholder);
    return;
  }

  state.posts.forEach((post) => {
    const el = makePostElement(post, { state, onUsernameClick, onDelete });
    dom.feedContainer.appendChild(el);
  });
}

async function savePost(state, content) {
  if (!state.currentUser) return;

  const { error } = await sb
    .from("posts")
    .insert({ user_id: state.currentUser.id, text: content });

  if (error) {
    console.error("Error saving post:", error);
    alert("Error posting: " + error.message);
  }
}

async function deletePost(postId) {
  const { error } = await sb.from("posts").delete().eq("id", postId);

  if (error) console.error("Error deleting post:", error);
}
