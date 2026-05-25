function switchAuthMode(state, dom) {
  state.isLogin = !state.isLogin;

  dom.modalTitle.textContent = state.isLogin
    ? "Welcome back"
    : "Create your space";
  dom.mainActionBtn.textContent = state.isLogin ? "Sign in" : "Join";
  dom.toggleModeBtn.textContent = state.isLogin
    ? "Create new space"
    : "I already have one";
  dom.toggleLink.textContent = state.isLogin
    ? "New here? Join MiniFeed"
    : "Back to sign in";

  setError(dom, "");
}

async function handleAuth(state, dom) {
  const username = dom.usernameInput.value.trim();
  const password = dom.passwordInput.value.trim();

  if (!username || !password) {
    setError(dom, "Both fields are required");
    return;
  }

  const email = getEmailFromUsername(username);

  const result = state.isLogin
    ? sb.auth.signInWithPassword({ email, password })
    : sb.auth.signUp({ email, password });

  const { data, error } = result;

  if (error) {
    console.error("Auth error:", error);
    setError(dom, error.message || "Authentication failed");
    return;
  }

  let sessionUser = data?.session?.user;

  if (!sessionUser) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 150));
      const { data: sessData } = await sb.auth.getSession();
      sessionUser = sessData?.session?.user;
      if (sessionUser) break;
    }
  }

  if (!sessionUser) {
    setError(dom, "Signed in, but session is delayed. Refresh once if needed.");
    return;
  }

  state.currentUser = { id: sessionUser.id, username };
  completeLogin(state, dom);
}

function completeLogin(state, dom) {
  setBodyLoggedIn(true);
  setHidden(dom.modal, true);
  setHidden(dom.composeSection, false);

  dom.emptyState.textContent = "Your space is quiet... share something? 🌌";
  dom.postContent.placeholder = `What's on your mind, @${state.currentUser.username}?`;

  dom.profileUsername.textContent = state.currentUser.username;
  dom.profileHandle.textContent = "@" + state.currentUser.username;
}

async function autoLogin(state, dom, onLoggedIn) {
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) return;

  const username = session.user.email.split("@")[0];
  state.currentUser = { id: session.user.id, username };

  completeLogin(state, dom);
  await onLoggedIn?.();
}

async function logout(dom) {
  if (!confirm("Log out now?")) return;
  await sb.auth.signOut();
  location.reload();
}
