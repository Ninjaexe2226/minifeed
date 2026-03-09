function showView(dom, viewId) {
  Object.values(dom.views).forEach((v) => {
    v.classList.remove("active");
    v.style.display = "none";
  });

  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  const view = dom.views[viewId];
  if (view) {
    view.classList.add("active");
    view.style.display = "block";
  }

  const navMap = {
    home: dom.navHome,
    alerts: dom.navAlerts,
    messages: dom.navMessages,
    profile: dom.navProfile,
  };
  navMap[viewId]?.classList.add("active");
}

function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", !!hidden);
}

function setError(dom, msg = "") {
  if (dom.errorMsg) dom.errorMsg.textContent = msg;
}

function setBodyLoggedIn(isLoggedIn) {
  document.body.classList.toggle("not-logged-in", !isLoggedIn);
  document.body.classList.toggle("logged-in", isLoggedIn);
}
