

function initProfileTabs(state, dom, loaders) {
  dom.profileTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      dom.profileTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.values(dom.tabContents).forEach(c => setHidden(c, true));
      const key = tab.dataset.tab;
      setHidden(dom.tabContents[key], false);

      await loaders[key]?.();
    });
  });
}

async function viewProfile(state, dom, userId, username, loaders) {
  if (!userId) return;

  const isMe = state.currentUser && String(userId) === String(state.currentUser.id);
  state.viewedUser = isMe ? null : { id: userId, username };

  // Back button + settings visibility
  setHidden(dom.backToFeedBtn, isMe);
  setHidden(dom.settingsTabBtn, !isMe);

  showView(dom, 'profile');

  await loadProfileHeader(state, dom, userId, username);
  await loadProfileCounts(dom, userId);

  // Default tab to posts
  dom.profileTabs.forEach(t => t.classList.remove('active'));
  dom.profileTabs[0]?.classList.add('active');
  Object.values(dom.tabContents).forEach(c => setHidden(c, true));
  setHidden(dom.tabContents.posts, false);

  await loaders.posts();
}

async function loadProfileHeader(state, dom, userId, fallbackUsername) {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('username, bio, avatar_url, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) console.error("Profile load error:", error);

  const username = profile?.username || fallbackUsername || 'username';
  const isAdmin = profile?.is_admin === true;

  dom.profileUsername.innerHTML =
    username + (isAdmin ? '<i class="fa-solid fa-check-circle admin-badge" title="Admin"></i>' : '');

  dom.profileHandle.textContent = '@' + username;
  dom.profileBio.textContent = profile?.bio || 'No bio yet';
}

async function loadProfileCounts(dom, userId) {
  const [{ count: following }, { count: followers }, { count: likes }] = await Promise.all([
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
    sb.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  dom.followingCount.textContent = following || 0;
  dom.followersCount.textContent = followers || 0;
  dom.likesCount.textContent = likes || 0;
}

function makeProfileLoaders(state, dom, { onUsernameClick, onDelete }) {
  const getUserId = () => state.viewedUser?.id || state.currentUser?.id;

  return {
    posts: async () => {
      const userId = getUserId();
      if (!userId) return;

      dom.tabContents.posts.innerHTML = '<p>Loading posts...</p>';

      const { data, error } = await sb
        .from('posts')
        .select(`id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading profile posts:", error);
        dom.tabContents.posts.innerHTML = '<p>Error loading posts</p>';
        return;
      }

      dom.tabContents.posts.innerHTML = '';
      if (!data?.length) {
        dom.tabContents.posts.innerHTML = `<p class="empty-feed">No posts yet.</p>`;
        return;
      }

      data.forEach(p => {
        const el = makePostElement(p, { state, onUsernameClick, onDelete });
        dom.tabContents.posts.appendChild(el);
      });
    },

    likes: async () => {
      if (!state.currentUser) return;
      if (state.viewedUser) {
        dom.tabContents.likes.innerHTML = `<p class="empty-feed">Likes are private (for now).</p>`;
        return;
      }

      dom.tabContents.likes.innerHTML = '<p>Loading liked posts...</p>';

      const { data: likes } = await sb
        .from('post_likes')
        .select('post_id')
        .eq('user_id', state.currentUser.id);

      if (!likes?.length) {
        dom.tabContents.likes.innerHTML = '<p class="empty-feed">No liked posts yet.</p>';
        return;
      }

      const postIds = likes.map(l => l.post_id);

      const { data: posts, error } = await sb
        .from('posts')
        .select(`id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin)`)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading liked posts:", error);
        dom.tabContents.likes.innerHTML = '<p>Error loading liked posts</p>';
        return;
      }

      dom.tabContents.likes.innerHTML = '';
      posts?.forEach(p => {
        const el = makePostElement(p, { state, onUsernameClick, onDelete });
        dom.tabContents.likes.appendChild(el);
      });
    },

    following: async () => {
      const userId = getUserId();
      if (!userId) return;

      dom.tabContents.following.innerHTML = '<p>Loading...</p>';

      const { data, error } = await sb
        .from('follows')
        .select('followed_id, profiles:followed_id(username)')
        .eq('follower_id', userId);

      if (error) {
        console.error("Following load error:", error);
        dom.tabContents.following.innerHTML = '<p>Error loading following</p>';
        return;
      }

      dom.tabContents.following.innerHTML = '';
      if (!data?.length) {
        dom.tabContents.following.innerHTML = '<p class="empty-feed">Not following anyone yet.</p>';
        return;
      }

      data.forEach(item => {
        const uname = item.profiles?.username || 'unknown';
        const row = document.createElement('div');
        row.style.padding = '1rem';
        row.style.borderBottom = '1px solid var(--border)';
        row.style.cursor = 'pointer';
        row.textContent = '@' + uname;
        row.addEventListener('click', () => onUsernameClick?.(item.followed_id, uname));
        dom.tabContents.following.appendChild(row);
      });
    },

    followers: async () => {
      const userId = getUserId();
      if (!userId) return;

      dom.tabContents.followers.innerHTML = '<p>Loading...</p>';

      const { data, error } = await sb
        .from('follows')
        .select('follower_id, profiles:follower_id(username)')
        .eq('followed_id', userId);

      if (error) {
        console.error("Followers load error:", error);
        dom.tabContents.followers.innerHTML = '<p>Error loading followers</p>';
        return;
      }

      dom.tabContents.followers.innerHTML = '';
      if (!data?.length) {
        dom.tabContents.followers.innerHTML = '<p class="empty-feed">No followers yet.</p>';
        return;
      }

      data.forEach(item => {
        const uname = item.profiles?.username || 'unknown';
        const row = document.createElement('div');
        row.style.padding = '1rem';
        row.style.borderBottom = '1px solid var(--border)';
        row.style.cursor = 'pointer';
        row.textContent = '@' + uname;
        row.addEventListener('click', () => onUsernameClick?.(item.follower_id, uname));
        dom.tabContents.followers.appendChild(row);
      });
    },

    settings: async () => {
      // nada por ahora
    },
  };
}