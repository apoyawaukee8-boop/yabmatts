(() => {
  const errorBox = document.querySelector("#auth-error");
  const showError = (message) => { if (!errorBox) return; errorBox.textContent = message; errorBox.classList.add("show"); };
  const safeNext = (role) => {
    const requested = new URLSearchParams(location.search).get("next");
    const allowed = role === "admin" ? ["admin.html"] : ["index.html", "home.html", "cart.html", "orders.html", "profile.html", "profile.html?view=favorites", "profile.html?view=orders"];
    return allowed.includes(requested) ? requested : role === "admin" ? "admin.html" : "index.html";
  };
  const syncStudent = (user) => {
    if (user?.role !== "student") return;
    if (user.clientId) localStorage.setItem("tambayts-client-id", user.clientId);
    const prior = (() => { try { return JSON.parse(localStorage.getItem("tambayts-profile") || "{}"); } catch { return {}; } })();
    localStorage.setItem("tambayts-profile", JSON.stringify({ ...prior, name: user.name, course: user.course || prior.course || "Student" }));
    document.dispatchEvent(new CustomEvent("tambayts-session", { detail: user }));
  };
  async function protectPage() {
    const protectedPage = document.body.dataset.auth;
    if (!protectedPage) return;
    try {
      const response = await fetch(`api/auth.php?role=${encodeURIComponent(protectedPage)}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Session verification is temporarily unavailable.");
      const { user } = result;
      if (user?.role !== protectedPage) {
        const next = `${location.pathname.split("/").pop()}${location.search}`;
        location.replace(`login.html?role=${protectedPage}&next=${encodeURIComponent(next)}`);
        return;
      }
      syncStudent(user);
      document.body.classList.add("authenticated");
    } catch (error) {
      console.error("Could not verify the current session:", error);
      const toast = document.querySelector("#toast");
      if (toast) {
        toast.textContent = "Could not verify your sign-in. Check the server and database, then refresh.";
        toast.classList.add("show");
      }
    }
  }
  document.querySelector(".reveal")?.addEventListener("click", (event) => {
    const input = event.currentTarget.closest(".password-row")?.querySelector("input");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    event.currentTarget.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
  });
  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    const role = new URLSearchParams(location.search).get("role");
    if (["admin", "student"].includes(role)) loginForm.elements.role.value = role;
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault(); errorBox?.classList.remove("show");
      const button = loginForm.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Signing in…";
      try {
        const response = await fetch("api/auth.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ action: "login", email: loginForm.elements.email.value.trim(), password: loginForm.elements.password.value, role: loginForm.elements.role.value }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to sign in.");
        syncStudent(result.user);
        location.replace(safeNext(result.user.role));
      } catch (error) { showError(error.message); button.disabled = false; button.innerHTML = 'Sign in <span>→</span>'; }
    });
  }
  const registerForm = document.querySelector("#register-form");
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault(); errorBox?.classList.remove("show");
    const button = registerForm.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Creating account…";
    try {
      const response = await fetch("api/auth.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ action: "register", name: registerForm.elements.name.value.trim(), email: registerForm.elements.email.value.trim(), course: registerForm.elements.course.value.trim(), password: registerForm.elements.password.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create account.");
      syncStudent(result.user); location.replace("index.html");
    } catch (error) { showError(error.message); button.disabled = false; button.textContent = "Create student account →"; }
  });
  const setupForm = document.querySelector("#setup-admin-form");
  setupForm?.addEventListener("submit", async (event) => {
    event.preventDefault(); errorBox?.classList.remove("show");
    const button = setupForm.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Setting up…";
    try {
      const response = await fetch("api/auth.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ action: "setup-admin", name: setupForm.elements.name.value.trim(), email: setupForm.elements.email.value.trim(), password: setupForm.elements.password.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to set up administrator.");
      location.replace("admin.html");
    } catch (error) { showError(error.message); button.disabled = false; button.textContent = "Set up administrator →"; }
  });
  if (document.querySelector(".setup-link")) fetch("api/auth.php", { headers: { Accept: "application/json" }, credentials: "same-origin" }).then((response) => response.json()).then((result) => { document.querySelector(".setup-link").hidden = !result.adminSetupAvailable; }).catch(() => {});
  protectPage();
})();
