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

  setHidden(dom.backToFeedBtn, isMe);
  setHidden(dom.settingsTabBtn, !isMe);

  showView(dom, 'profile');

  await loadProfileHeader(state, dom, userId, username);
  await loadProfileCounts(dom, userId);

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

  const bigAvatar = document.querySelector('.avatar.profile-avatar');
  if (bigAvatar) {
    if (profile?.avatar_url) {
      bigAvatar.style.backgroundImage = `url('${profile.avatar_url}')`;
      bigAvatar.style.backgroundSize = 'cover';
      bigAvatar.style.backgroundPosition = 'center';
    } else {
      bigAvatar.style.backgroundImage = 'none';
    }
  }
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
        .select(`id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin, avatar_url)`)
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
        .select(`id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin, avatar_url)`)
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

      dom.tabContents.following.innerHTML = '<p style="padding:1rem; color:var(--gray);">Loading...</p>';

      const { data, error } = await sb
        .from('follows')
        .select('followed_id, profiles!follows_followed_id_fkey(username, avatar_url)')
        .eq('follower_id', userId);

      if (error) {
        console.error("Following load error:", error);
        dom.tabContents.following.innerHTML = '<p style="padding:1rem; color:red;">Error loading following</p>';
        return;
      }

      dom.tabContents.following.innerHTML = '';
      if (!data?.length) {
        dom.tabContents.following.innerHTML = '<p class="empty-feed">Not following anyone yet.</p>';
        return;
      }

      data.forEach(item => {
        const uname = item.profiles?.username || 'unknown';
        const targetId = item.followed_id;
        
        const followingAvatar = item.profiles?.avatar_url 
          ? `style="background-image: url('${item.profiles.avatar_url}'); background-size: cover; background-position: center;"` 
          : '';

        const row = document.createElement('div');
        row.className = 'post';
        row.style.padding = '1rem';
        row.style.cursor = 'pointer';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '1rem';
        row.innerHTML = `
          <div class="avatar" ${followingAvatar}></div>
          <div>
            <div class="username" style="font-weight:bold; color:white;">${uname}</div>
            <div class="handle" style="color:var(--gray); font-size:0.9rem;">@${uname}</div>
          </div>
        `;
        
        row.addEventListener('click', () => {
          onUsernameClick?.(targetId, uname);
        });
        
        dom.tabContents.following.appendChild(row);
      });
    },

    settings: async () => {
      if (!state.currentUser) return;

      // Renderizamos la interfaz incluyendo la sección de Log Out abajo
      dom.tabContents.settings.innerHTML = `
        <div style="max-width: 450px; margin: 0 auto; text-align: left; padding: 1rem; display: flex; flex-direction: column; gap: 2rem;">
          
          <div>
            <h3 style="color: white; margin-bottom: 1.5rem; font-size: 1.3rem; font-weight: 600;">Account Settings</h3>
            <form id="settingsForm" style="display: flex; flex-direction: column; gap: 1.5rem;">
              <div>
                <label style="display: block; margin-bottom: 0.5rem; color: var(--gray); font-size: 0.9rem;">Profile Picture</label>
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <div id="settingsAvatarPreview" class="avatar" style="width: 60px; height: 60px; background-size: cover; background-position: center; border-radius: 50%; background-color: rgba(255,255,255,0.1);"></div>
                  <input type="file" id="avatarInput" accept="image/*" style="font-size: 0.85rem; color: var(--gray);">
                </div>
              </div>

              <div>
                <label style="display: block; margin-bottom: 0.5rem; color: var(--gray); font-size: 0.9rem;">Update Biography</label>
                <textarea id="settingsBio" rows="4" style="width: 100%; padding: 0.8rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); color: white; border-radius: 8px; resize: none; font-family: inherit; font-size: 0.95rem;" placeholder="Tell us about yourself..."></textarea>
              </div>
              
              <button type="submit" id="saveSettingsBtn" class="btn btn-primary" style="align-self: flex-start; padding: 0.6rem 1.8rem; background: var(--accent); border: none; border-radius: 20px; color: white; cursor: pointer; font-weight: bold; font-size: 0.95rem;">
                Save Changes
              </button>
            </form>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 1.5rem;">
            <h4 style="color: white; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">Session Management</h4>
            <p style="color: var(--gray); font-size: 0.85rem; margin-bottom: 1rem;">Disconnect your account from this device.</p>
            <button type="button" id="settingsLogOutBtn" class="btn" style="padding: 0.6rem 1.5rem; background: #ff4a4a; border: none; border-radius: 20px; color: white; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: background 0.2s;">
              <i class="fa-solid fa-right-from-bracket" style="margin-right: 0.5rem;"></i> Log Out
            </button>
          </div>

        </div>
      `;

      dom.settingsForm = document.getElementById("settingsForm");
      dom.settingsBio = document.getElementById("settingsBio");
      dom.saveSettingsBtn = document.getElementById("saveSettingsBtn");
      dom.avatarInput = document.getElementById("avatarInput");
      dom.avatarPreview = document.getElementById("settingsAvatarPreview");
      const logoutBtn = document.getElementById("settingsLogOutBtn");

      if (dom.settingsBio) dom.settingsBio.value = "Loading settings...";

      const { data, error } = await sb
        .from('profiles')
        .select('bio, avatar_url')
        .eq('id', state.currentUser.id)
        .single();

      if (!error && data) {
        if (dom.settingsBio) dom.settingsBio.value = data.bio || "";
        if (data.avatar_url && dom.avatarPreview) {
          dom.avatarPreview.style.backgroundImage = `url('${data.avatar_url}')`;
        }
      }

      // Evento para guardar cambios
      dom.settingsForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUpdateSettings(state, dom);
      });

      // Evento para Cerrar Sesión directamente
      logoutBtn?.addEventListener('click', async () => {
        if (confirm("Are you sure you want to log out?")) {
          await sb.auth.signOut();
          window.location.reload(); // Recarga la aplicación para volver a la pantalla de Login
        }
      });
    }
  };
}

async function handleUpdateSettings(state, dom) {
  if (!state.currentUser) return;

  dom.saveSettingsBtn.textContent = "Saving...";
  dom.saveSettingsBtn.disabled = true;

  try {
    const newBio = dom.settingsBio.value.trim();
    let finalAvatarUrl = null;

    const file = dom.avatarInput?.files[0];
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${state.currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = sb.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      finalAvatarUrl = urlData.publicUrl;
    }

    const updates = { bio: newBio };
    if (finalAvatarUrl) {
      updates.avatar_url = finalAvatarUrl;
    }

    const { error: dbError } = await sb
      .from("profiles")
      .update(updates)
      .eq("id", state.currentUser.id);

    if (dbError) throw dbError;

    alert("Profile updated successfully! ✨");

    if (dom.profileBio) dom.profileBio.textContent = newBio || 'No bio yet';
    
    if (finalAvatarUrl) {
      if (dom.avatarPreview) {
        dom.avatarPreview.style.backgroundImage = `url('${finalAvatarUrl}')`;
      }
      const bigAvatar = document.querySelector('.avatar.profile-avatar');
      if (bigAvatar) {
        bigAvatar.style.backgroundImage = `url('${finalAvatarUrl}')`;
        bigAvatar.style.backgroundSize = 'cover';
        bigAvatar.style.backgroundPosition = 'center';
      }
    }

  } catch (error) {
    console.error("Error updating profile settings:", error);
    alert("Could not save settings: " + error.message);
  } finally {
    dom.saveSettingsBtn.textContent = "Save Changes";
    dom.saveSettingsBtn.disabled = false;
  }
}