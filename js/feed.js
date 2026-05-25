async function loadPosts(state, dom, { onUsernameClick, onDelete }) {
  if (!state.currentUser) return;

  // 1. Cargamos los posts iniciales de la base de datos
  const { data, error } = await sb
    .from("posts")
    .select(
      `id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin, avatar_url)`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading posts:", error);
    return;
  }

  state.posts = data || [];
  renderFeed(state, dom, { onUsernameClick, onDelete });

  // 2. 🌟 ACTIVAMOS EL TIEMPO REAL AUTOMÁTICAMENTE 🌟
  // Evitamos duplicar conexiones verificando si ya existe un canal activo
  if (!state.realtimeSubscribed) {
    sb
      .channel("posts-live-feed")
      .on(
        "postgres_changes",
        {
          event: "*", // Escucha cuando alguien crea (INSERT) o elimina (DELETE) un post
          schema: "public",
          table: "posts"
        },
        async (payload) => {
          console.log("¡Cambio detectado en el feed! 🚀", payload);

          // CASO A: Alguien creó una nueva publicación
          if (payload.eventType === "INSERT") {
            // Hacemos una consulta rápida para traer el post nuevo con los datos de su perfil (username, avatar)
            const { data: newPost, error: fetchErr } = await sb
              .from("posts")
              .select(`id, user_id, text, created_at, profiles:profiles!posts_user_id_fkey (username, is_admin, avatar_url)`)
              .eq("id", payload.new.id)
              .maybeSingle();

            if (!fetchErr && newPost) {
              // Lo metemos al inicio de nuestra lista en memoria
              state.posts.unshift(newPost);
              // Volvemos a dibujar el feed en la pantalla al instante
              renderFeed(state, dom, { onUsernameClick, onDelete });
            }
          }

          // CASO B: Alguien (o un administrador) borró una publicación
          if (payload.eventType === "DELETE") {
            // Lo eliminamos de la lista usando el ID viejo enviado por Supabase
            state.posts = state.posts.filter(post => post.id !== payload.old.id);
            // Redibujamos el feed limpio
            renderFeed(state, dom, { onUsernameClick, onDelete });
          }
        }
      )
      .subscribe();

    // Marcamos como suscrito para no crear canales infinitos cada vez que refresques el feed
    state.realtimeSubscribed = true;
  }
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
    .insert({ 
      user_id: state.currentUser.id, 
      text: content,
      username: state.currentUser.username
    });

  if (error) {
    console.error("Error saving post:", error);
    alert("Error posting: " + error.message);
  }
}

async function deletePost(postId) {
  const { error } = await sb.from("posts").delete().eq("id", postId);

  if (error) console.error("Error deleting post:", error);
}