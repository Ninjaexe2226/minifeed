function makePostElement(post, { state, onDelete, onUsernameClick }) {
  const isOwn = state.currentUser && post.user_id === state.currentUser.id;
  const username = post.profiles?.username || post.username || "unknown";
  const isAdmin = post.profiles?.is_admin === true;
  const timeAgo = getRelativeTime(new Date(post.created_at).getTime());

  const el = document.createElement("div");
  el.className = "post";

  el.innerHTML = `
    <div class="post-header">
      <div class="post-meta">
        <div class="avatar"></div>
        <div>
          <div class="username js-username" style="cursor:pointer;"
               data-user-id="${post.user_id}" data-username="${username}">
            ${username}
            ${isAdmin ? '<i class="fa-solid fa-check-circle admin-badge" title="Admin"></i>' : ""}
          </div>
          <div class="handle">@${username} · <span class="timestamp">${timeAgo}</span></div>
        </div>
      </div>

      ${
        isOwn
          ? `
        <button class="delete-btn js-delete" data-id="${post.id}" type="button" aria-label="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `
          : ""
      }
    </div>

    <div class="post-text">${nl2brSafe(post.text || "")}</div>

    <div class="post-actions">
      <div class="action"><i class="fa-regular fa-comment"></i> 0</div>
      <div class="action"><i class="fa-solid fa-retweet"></i> 0</div>
      <div class="action like js-like"><i class="fa-regular fa-heart"></i> <span>0</span></div>
    </div>
  `;

  // Username click → profile
  el.querySelector(".js-username")?.addEventListener("click", () => {
    const userId = el.querySelector(".js-username")?.dataset.userId;
    const uname = el.querySelector(".js-username")?.dataset.username;
    if (!userId) return;
    onUsernameClick?.(userId, uname);
  });

  // Like (UI-only)
  const likeArea = el.querySelector(".js-like");
  likeArea?.addEventListener("click", () => {
    const heart = likeArea.querySelector("i");
    const counter = likeArea.querySelector("span");
    let num = parseInt(counter.textContent.trim(), 10) || 0;

    if (heart.classList.contains("fa-regular")) {
      heart.classList.replace("fa-regular", "fa-solid");
      likeArea.classList.add("active");
      num++;
    } else {
      heart.classList.replace("fa-solid", "fa-regular");
      likeArea.classList.remove("active");
      num = Math.max(0, num - 1);
    }
    counter.textContent = String(num);
  });

  // Delete
  el.querySelector(".js-delete")?.addEventListener("click", async (e) => {
    const id = e.currentTarget?.dataset?.id;
    if (!id) return;
    if (confirm("Delete this post?")) {
      await onDelete?.(id);
    }
  });

  return el;
}
