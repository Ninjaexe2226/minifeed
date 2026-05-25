async function loadConversations(state, dom) {
  if (!state.currentUser) return;

  dom.conversationsList.innerHTML = "<p>Loading conversations...</p>";

  const { data: convos, error } = await sb
    .from("conversations")
    .select(
      `
      id,
      user1_id,
      user2_id,
      user1:profiles!conversations_user1_id_fkey (username),
      user2:profiles!conversations_user2_id_fkey (username)
    `,
    )
    .or(
      `user1_id.eq.${state.currentUser.id},user2_id.eq.${state.currentUser.id}`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading conversations:", error);
    dom.conversationsList.innerHTML = `<p>Error loading conversations: ${error.message || "Unknown error"}</p>`;
    return;
  }

  dom.conversationsList.innerHTML = "";
  setHidden(dom.noMessages, !!convos?.length ? true : false);

  if (!convos?.length) {
    dom.conversationsList.innerHTML =
      '<p class="empty-feed">No conversations yet. Start one!</p>';
    return;
  }

  convos.forEach((c) => {
    const isUser1Me = c.user1_id === state.currentUser.id;
    const partnerProfile = isUser1Me ? c.user2 : c.user1;
    const partnerUsername = partnerProfile?.username || "Unknown user";
    const partnerId = isUser1Me ? c.user2_id : c.user1_id;

    const item = document.createElement("div");
    item.style.padding = "1rem";
    item.style.background = "var(--card-bg)";
    item.style.borderRadius = "12px";
    item.style.marginBottom = "0.8rem";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <strong>@${partnerUsername}</strong>
      <p style="color:var(--gray); font-size:0.9rem; margin-top:0.3rem;">Tap to chat</p>
    `;

    item.addEventListener("click", () =>
      openConversation(state, dom, c.id, partnerUsername, partnerId),
    );
    dom.conversationsList.appendChild(item);
  });
}

function teardownMessagesRealtime(state) {
  if (state.messagesSubscription) {
    state.messagesSubscription.unsubscribe();
    state.messagesSubscription = null;
  }
}

function openConversation(state, dom, convId, partnerName) {
  state.currentConversationId = convId;
  state.currentChatPartner = partnerName;

  dom.chatWith.textContent = `Chat with @${partnerName}`;

  setHidden(dom.conversationsList, true);
  setHidden(dom.chatView, false);
  setHidden(dom.noMessages, true);

  loadMessages(state, dom, convId);

  teardownMessagesRealtime(state);

  state.messagesSubscription = sb
    .channel(`conversation:${convId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${convId}`,
      },
      (payload) => appendMessage(state, dom, payload.new),
    )
    .subscribe();
}

async function loadMessages(state, dom, convId) {
  dom.messagesContainer.innerHTML = "<p>Loading messages...</p>";

  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    dom.messagesContainer.innerHTML = "<p>Error loading messages</p>";
    return;
  }

  dom.messagesContainer.innerHTML = "";
  data.forEach((msg) => appendMessage(state, dom, msg));
}

function appendMessage(state, dom, msg) {
  const isMine = msg.sender_id === state.currentUser.id;

  const bubble = document.createElement("div");
  bubble.style.margin = "0.2rem 0";
  bubble.style.padding = "0.8rem 1.2rem";
  bubble.style.borderRadius = "18px";
  bubble.style.maxWidth = "80%";
  bubble.style.background = isMine ? "var(--accent)" : "rgba(200,140,255,0.15)";
  bubble.style.alignSelf = isMine ? "flex-end" : "flex-start";
  bubble.style.color = isMine ? "white" : "var(--text)";

  bubble.textContent = msg.content;

  const time = document.createElement("small");
  time.style.display = "block";
  time.style.marginTop = "0.3rem";
  time.style.opacity = "0.7";
  time.style.fontSize = "0.8rem";
  time.textContent = getRelativeTime(new Date(msg.created_at).getTime());

  bubble.appendChild(time);
  dom.messagesContainer.appendChild(bubble);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

async function sendChatMessage(state, dom) {
  const content = dom.chatInput.value.trim();
  if (!content || !state.currentConversationId) return;

  const { error } = await sb.from("messages").insert({
    conversation_id: state.currentConversationId,
    sender_id: state.currentUser.id,
    content,
  });

  if (error) {
    console.error("Send error:", error);
    alert("Failed to send message");
  } else {
    dom.chatInput.value = "";
  }
}

async function sendFirstMessage(state, dom) {
  const toUsername = dom.newMessageUsername.value.trim();
  const content = dom.newMessageContent.value.trim();

  if (!toUsername || !content) {
    alert("Please enter a username and message");
    return;
  }

  const { data: targetUser, error: userError } = await sb
    .from("profiles")
    .select("id, username")
    .ilike("username", toUsername)
    .maybeSingle();

  if (userError) {
    console.error("User search error:", userError);
    alert("Error searching for user: " + userError.message);
    return;
  }

  if (!targetUser) {
    alert(
      `User "@${toUsername}" not found.\n\nMake sure they have signed up and have a profile.`,
    );
    return;
  }

  const partnerId = targetUser.id;
  const partnerUsername = targetUser.username;

  const { data: existingConv, error: convCheckError } = await sb
    .from("conversations")
    .select("id")
    .or(
      `and(user1_id.eq.${state.currentUser.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${state.currentUser.id})`,
    )
    .maybeSingle();

  if (convCheckError) {
    console.error("Conversation check error:", convCheckError);
    alert("Error checking conversation: " + convCheckError.message);
    return;
  }

  let convId = existingConv?.id;

  if (!convId) {
    const { data: newConv, error: createConvError } = await sb
      .from("conversations")
      .insert({ user1_id: state.currentUser.id, user2_id: partnerId })
      .select("id")
      .single();

    if (createConvError) {
      console.error("Create conversation error:", createConvError);
      alert("Failed to start chat: " + createConvError.message);
      return;
    }

    convId = newConv.id;
  }

  const { error: sendError } = await sb.from("messages").insert({
    conversation_id: convId,
    sender_id: state.currentUser.id,
    content,
  });

  if (sendError) {
    console.error("Message send error:", sendError);
    alert("Failed to send message: " + sendError.message);
    return;
  }

  dom.newMessageUsername.value = "";
  dom.newMessageContent.value = "";

  openConversation(state, dom, convId, partnerUsername, partnerId);
  await loadConversations(state, dom);
}
