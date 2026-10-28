const { getAdminFoods, getCart, saveCart, getFavorites, saveFavorites, getOrders, saveOrders, getProfile, saveProfile, getClientId, peso } = TamBayts;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const findFood = (name) => getAdminFoods().find((food) => food.name === name && food.available);
const toast = document.querySelector("#toast");
let favoriteViewItems = null;
const favoriteToggleState = new Map();
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}
function updateBadges() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll(".cart-badge, #cart-badge").forEach((badge) => {
    badge.textContent = count;
    badge.classList.toggle("has-items", count > 0);
  });
}
function renderCartPage() {
  const target = document.querySelector("#cart-page-items");
  if (!target) return;
  const items = getCart().map((cartItem) => ({ ...findFood(cartItem.name), quantity: cartItem.quantity })).filter((item) => item.name);
  target.innerHTML = items.length ? items.map((item) => `<article class="cart-page-line"><div><h2>${item.name}</h2><p>${item.category}</p></div><strong>${peso(item.price * item.quantity)}</strong><div class="cart-quantity"><button data-decrease="${item.name}" aria-label="Remove one ${item.name}">−</button><span>${item.quantity}</span><button data-increase="${item.name}" aria-label="Add one ${item.name}">+</button></div></article>`).join("")
    : '<div class="cart-empty"><span>🛒</span><h2>Your cart is empty</h2><p>Add something tasty from the menu.</p><a href="index.html">Browse food</a></div>';
  const orderSummary = document.querySelector("#cart-order-summary");
  if (orderSummary) orderSummary.hidden = items.length === 0;
  document.querySelector("#cart-page-total").textContent = peso(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
}
function renderOrderReview() {
  const target = document.querySelector("#order-review-items");
  if (!target) return [];
  const items = getCart().map((cartItem) => ({ ...findFood(cartItem.name), quantity: cartItem.quantity })).filter((item) => item.name);
  target.innerHTML = items.length ? items.map((item) => `<article class="order-review-line"><div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.category)} · ${item.quantity} × ${peso(item.price)}</p></div><strong>${peso(item.price * item.quantity)}</strong></article>`).join("") : '<p class="order-review-empty">Your cart has no available foods to order.</p>';
  document.querySelector("#review-order-total").textContent = peso(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  return items;
}
function renderOrders(status = "active") {
  const targets = [document.querySelector("#order-list"), document.querySelector("#profile-order-list")].filter(Boolean);
  if (!targets.length) return;
  const card = (order, isPastOrder) => {
    const ready = order.status === "Ready";
    const done = ["Picked up", "Completed"].includes(order.status);
    const pending = order.status === "Pending";
    const statusMessage = order.status === "Pending"
      ? "Waiting for the stall to confirm your order."
      : order.status === "Preparing" ? "The stall is preparing your order."
      : ready ? "Your order is ready for pickup."
      : done ? "Order completed. Thank you!" : `Placed ${order.createdAt}`;
    const firstStep = pending ? "current" : "done";
    const secondStep = order.status === "Preparing" ? "current" : ready || done ? "done" : "";
    const thirdStep = ready ? "current" : done ? "done" : "";
    const statusClass = done ? "picked-up" : pending ? "pending" : order.status.toLowerCase();
    const progress = isPastOrder ? "" : `<div class="order-progress" aria-label="Order progress"><span class="${firstStep}"></span><span class="${secondStep}"></span><span class="${thirdStep}"></span></div><div class="order-labels"><span>Received</span><span>Preparing</span><span>Ready</span></div>`;
    const foodNames = (order.names || []).map(escapeHtml).filter(Boolean).join(", ") || "Food items";
    const isPaid = order.paymentStatus === "paid";
    const paymentStatus = isPaid ? "Paid in cash" : "Cash due at pickup";
    return `<article class="order-card"><div class="order-top"><div><span class="order-status ${statusClass}">${escapeHtml(order.status)}</span><p class="order-reference">Order #${escapeHtml(order.id)}</p><h2 class="order-food-names">${foodNames}</h2></div><strong>${peso(order.total)}</strong></div>${progress}<p class="order-payment ${isPaid ? "paid" : "due"}">Payment: <strong>${paymentStatus}</strong></p><div class="order-action"><span>${escapeHtml(statusMessage)}</span></div></article>`;
  };
  targets.forEach((target) => {
    const selectedStatus = target.id === "profile-order-list" ? "past" : status;
    const shown = getOrders().filter((order) => selectedStatus === "past" ? ["Picked up", "Completed"].includes(order.status) : !["Picked up", "Completed"].includes(order.status));
    const emptyState = target.id === "profile-order-list" ? "" : '<article class="empty-order"><span>☼</span><h2>No orders here yet</h2><p>Browse the menu when you are ready for a meal.</p><a href="index.html">Browse food</a></article>';
    target.innerHTML = shown.length ? shown.map((order) => card(order, selectedStatus === "past")).join("") : emptyState;
  });
}
function renderFavorites() {
  const target = document.querySelector("#saved-list");
  if (!target) return;
  if (favoriteViewItems === null) favoriteViewItems = getFavorites().map(findFood).filter(Boolean);
  const saved = new Set(getFavorites());
  target.innerHTML = favoriteViewItems.length ? favoriteViewItems.map((item) => {
    const isFavorite = favoriteToggleState.has(item.name) ? favoriteToggleState.get(item.name) : saved.has(item.name);
    const name = escapeHtml(item.name);
    return `<article class="favorite-meal"><div><h3>${name}</h3><small>${escapeHtml(item.category)}</small></div><strong>${peso(item.price)}</strong><button class="favorite-meal-star ${isFavorite ? "is-favorite" : ""}" type="button" data-toggle-favorite="${name}" aria-label="${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} favorites" title="Toggle favorite">${isFavorite ? "★" : "☆"}</button></article>`;
  }).join("") : '<p class="no-favorites">No favorite meals yet. Tap a star on the menu to save one.</p>';
}
function renderProfile() {
  const profile = getProfile();
  const name = document.querySelector("#profile-name");
  if (!name) return;
  name.textContent = profile.name;
  document.querySelector("#profile-course").textContent = profile.course;
  document.querySelector("#profile-view-name").textContent = profile.name;
  document.querySelector("#profile-view-course").textContent = profile.course || "Not provided";
  renderFavorites();
}
document.querySelector("#cart-page-items")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-increase], [data-decrease]");
  if (!button) return;
  const name = button.dataset.increase || button.dataset.decrease;
  const cart = getCart();
  const item = cart.find((cartItem) => cartItem.name === name);
  if (!item) return;
  item.quantity += button.dataset.increase ? 1 : -1;
  saveCart(cart.filter((cartItem) => cartItem.quantity > 0));
  renderCartPage();
  updateBadges();
});
document.querySelector("#review-order")?.addEventListener("click", () => {
  if (!renderOrderReview().length) return showToast("Add food to your cart before placing an order.");
  document.querySelector("#cart-edit-view").hidden = true;
  document.querySelector("#order-review").hidden = false;
});
document.querySelector("#back-to-cart")?.addEventListener("click", () => {
  document.querySelector("#order-review").hidden = true;
  document.querySelector("#cart-edit-view").hidden = false;
});
document.querySelector("#confirm-place-order")?.addEventListener("click", async (event) => {
  const cart = getCart();
  if (!cart.length) return showToast("Your cart is empty.");
  const items = cart.map((cartItem) => ({ ...findFood(cartItem.name), quantity: cartItem.quantity })).filter((item) => item.name);
  if (!items.length) return showToast("Your cart has no valid items.");
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Placing order…";
  try {
    const clientId = getClientId();
    const response = await fetch("api/orders.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ name, quantity }) => ({ name, quantity })),
      }),
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      const isPhpPage = responseText.trimStart().startsWith("<");
      throw new Error(isPhpPage
        ? "The order API returned a server error. Open the site through XAMPP (http://localhost/...) and check the PHP error log."
        : "The order API returned an empty or invalid response. Make sure Apache and MySQL are running in XAMPP and open the site through http://localhost/...");
    }
    if (response.status === 401) { location.href = "login.html?role=student&next=cart.html"; return; }
    if (!response.ok) throw new Error(result.error || "Order could not be saved.");
    saveOrders([result.order, ...getOrders()]);
    saveCart([]);
    location.href = "orders.html";
  } catch (error) {
    showToast(error.message || "Could not connect to the order database.");
    button.disabled = false;
    button.textContent = "Confirm and place order";
  }
});
document.querySelectorAll("#order-tabs").forEach((tabs) => {
  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    tabs.querySelectorAll("button").forEach((tab) => tab.classList.toggle("selected", tab === button));
    renderOrders(button.dataset.tab);
  });
});
document.querySelector("#edit-profile")?.addEventListener("click", () => {
  const profile = getProfile();
  const name = prompt("Your display name", profile.name);
  if (!name?.trim()) return;
  saveProfile({ ...profile, name: name.trim() });
  renderProfile();
  showToast("Profile updated");
});
function setProfileView(view) {
  const isDetail = ["favorites", "orders", "details"].includes(view);
  document.querySelector("#profile-card")?.toggleAttribute("hidden", isDetail);
  document.querySelector(".profile-shortcuts")?.toggleAttribute("hidden", isDetail);
  document.querySelector("#profile-default-view")?.toggleAttribute("hidden", isDetail);
  document.querySelector("#profile-favorites-view")?.toggleAttribute("hidden", view !== "favorites");
  document.querySelector("#profile-orders-view")?.toggleAttribute("hidden", view !== "orders");
  document.querySelector("#profile-details-view")?.toggleAttribute("hidden", view !== "details");
  const title = document.querySelector("#profile-title");
  if (title) title.textContent = view === "favorites" ? "Favorites" : view === "orders" ? "Order history" : view === "details" ? "View profile" : "My profile";
  if (view === "favorites") renderFavorites();
  if (view === "orders") renderOrders("past");
  if (view === "details") {
    const profile = getProfile();
    document.querySelector("#profile-edit-name").value = profile.name;
    document.querySelector("#profile-edit-course").value = profile.course || "";
    document.querySelectorAll(".profile-inline-form").forEach((form) => { form.hidden = true; });
  }
}
document.querySelector(".profile-page")?.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-profile-view]");
  if (viewButton) setProfileView(viewButton.dataset.profileView);
  const favoriteButton = event.target.closest("[data-toggle-favorite]");
  if (favoriteButton) {
    const name = favoriteButton.dataset.toggleFavorite;
    const favorites = getFavorites();
    const isFavorite = !favorites.includes(name);
    saveFavorites(isFavorite ? [...favorites, name] : favorites.filter((favorite) => favorite !== name));
    favoriteToggleState.set(name, isFavorite);
    favoriteButton.classList.toggle("is-favorite", isFavorite);
    favoriteButton.textContent = isFavorite ? "★" : "☆";
    favoriteButton.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} favorites`);
  }
});
if (document.querySelector(".profile-page")) {
  const initialView = new URLSearchParams(location.search).get("view");
  if (["favorites", "orders", "details"].includes(initialView)) setProfileView(initialView);
}
document.querySelectorAll("[data-edit-profile-field]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.editProfileField;
    const input = document.querySelector(`#profile-edit-${field}`);
    document.querySelectorAll(".profile-inline-form").forEach((form) => { form.hidden = form.dataset.profileField !== field; });
    input.value = field === "name" ? getProfile().name : getProfile().course || "";
    input.focus();
  });
});
document.querySelectorAll("[data-cancel-profile-field]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.cancelProfileField;
    document.querySelector(`[data-profile-field="${field}"]`).hidden = true;
  });
});
document.querySelectorAll(".profile-inline-form").forEach((form) => form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const profile = getProfile();
  const field = form.dataset.profileField;
  const value = form.elements.namedItem(field).value.trim();
  if (field === "name" && !value) return showToast("Enter your name.");
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const response = await fetch("api/auth.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "update-profile", [field]: value }),
    });
    const result = await response.json();
    if (response.status === 401) { location.href = "login.html?role=student&next=profile.html"; return; }
    if (!response.ok || !result.user) throw new Error(result.error || "Could not update your profile.");
    saveProfile({ ...profile, name: result.user.name, course: result.user.course || "" });
    renderProfile();
    form.hidden = true;
    showToast("Profile updated.");
  } catch (error) {
    showToast(error.message || "Could not update your profile.");
  } finally {
    button.disabled = false;
    button.textContent = "Save";
  }
}));
document.querySelector("#settings-list")?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button?.id === "student-sign-out") return;
  if (button) showToast(`${button.dataset.setting} settings will be available soon.`);
});
const signOutDialog = document.querySelector("#sign-out-dialog");
document.querySelector("#student-sign-out")?.addEventListener("click", () => signOutDialog?.showModal());
document.querySelector("#cancel-sign-out")?.addEventListener("click", () => signOutDialog?.close());
document.querySelector("#confirm-sign-out")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Signing out…";
  try {
    const response = await fetch("api/auth.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", role: "student" }),
    });
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    location.replace("login.html?role=student");
  } catch (error) {
    showToast(error.message || "Could not sign out. Please try again.");
    button.disabled = false;
    button.textContent = "Sign out";
  }
});
let orderRefreshInFlight = false;
async function loadDatabaseOrders() {
  if (!document.querySelector("#order-list, #profile-order-list")) return;
  if (orderRefreshInFlight) return;
  orderRefreshInFlight = true;
  try {
    const response = await fetch("api/orders.php", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (response.status === 401) { location.href = `login.html?role=student&next=${document.querySelector("#profile-order-list") ? "profile.html?view=orders" : "orders.html"}`; return; }
    if (!response.ok) return;
    const result = await response.json();
    if (!Array.isArray(result.orders)) return;
    saveOrders(result.orders);
    renderOrders(document.querySelector("#order-tabs .selected")?.dataset.tab || "active");
  } catch {} finally {
    orderRefreshInFlight = false;
  }
}

document.addEventListener("tambayts-session", () => renderProfile());
updateBadges();
renderCartPage();
renderOrders();
renderProfile();
loadDatabaseOrders();
if (document.querySelector("#order-list, #profile-order-list")) {
  window.setInterval(() => {
    if (!document.hidden) loadDatabaseOrders();
  }, 5000);
  window.addEventListener("focus", loadDatabaseOrders);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadDatabaseOrders();
  });
}
