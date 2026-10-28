const peso = (amount) => `₱${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

let dashboard = { menu: [], orders: [], students: [], summary: { ordersToday: 0, salesToday: 0, studentCount: 0 } };
let pendingMenuRemovalId = null;
let dashboardPollStarted = false;
let dashboardRefreshInFlight = false;
let lastDashboardRefreshError = "";

function notify(message) {
  const toast = byId("admin-toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

async function requestAdmin(method = "GET", body = undefined) {
  const response = await fetch("api/admin.php", {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (response.status === 401) location.href = "login.html?role=admin&next=admin.html";
  if (!response.ok) throw new Error(result.error || "Admin request failed.");
  return result;
}

function renderStats() {
  const { ordersToday, salesToday, studentCount } = dashboard.summary;
  const unavailable = dashboard.menu.filter((item) => !item.available).length;
  byId("stat-orders").textContent = ordersToday;
  byId("stat-orders-note").textContent = ordersToday ? `${ordersToday} recorded order${ordersToday === 1 ? "" : "s"} today` : "No orders today";
  byId("stat-sales").textContent = peso(salesToday);
  byId("stat-menu").textContent = dashboard.menu.length - unavailable;
  byId("stat-menu-note").textContent = `${unavailable} unavailable`;
  byId("stat-students").textContent = studentCount;
  byId("student-count-note").textContent = "Stored in MySQL";
  byId("nav-order-count").textContent = dashboard.orders.filter((order) => !["Picked up", "Completed", "Cancelled"].includes(order.status)).length;
}

function renderOrders() {
  const orders = dashboard.orders;
  byId("no-orders").classList.toggle("hidden", orders.length > 0);
  byId("admin-orders").innerHTML = orders.map((order) => {
    const next = order.status === "Pending" ? "Preparing" : order.status === "Preparing" ? "Ready" : order.status === "Ready" ? "Picked up" : null;
    const statusClass = order.status === "Ready" ? "ready" : ["Picked up", "Completed"].includes(order.status) ? "picked" : "";
    const names = Array.isArray(order.names) ? order.names.join(", ") : (order.names || "—");
    const paymentLabel = order.paymentStatus === "paid" ? "Paid in cash" : "Cash due at pickup";
    const actionLabel = next === "Picked up" ? "Mark picked up & paid" : next ? `Mark ${next}` : "Complete";
    return `<tr>
      <td class="order-code">#${escapeHtml(order.id)}</td><td>${escapeHtml(order.student || "Student")}</td>
      <td>${escapeHtml(names)}</td><td>${peso(order.total)}</td><td><span class="payment-label ${order.paymentStatus === "paid" ? "paid" : "due"}">${paymentLabel}</span></td>
      <td><span class="status-pill ${statusClass}">${escapeHtml(order.status || "Pending")}</span></td>
      <td><button class="table-action" data-order="${escapeHtml(order.id)}" ${next ? "" : "disabled"}>${actionLabel}</button></td>
    </tr>`;
  }).join("");
}

function renderMenu() {
  const foods = dashboard.menu;
  byId("no-menu-items").classList.toggle("hidden", foods.length > 0);
  byId("admin-menu").innerHTML = foods.map((food) => `
    <div class="menu-row">
      ${food.imageUrl ? `<img class="food-swatch" src="${escapeHtml(food.imageUrl)}" alt="">` : '<span class="food-swatch"></span>'}
      <div class="menu-details"><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(food.category)} · ${peso(food.price)}</small></div>
      <label class="availability ${food.available ? "" : "off"}"><input type="checkbox" data-availability="${food.id}" ${food.available ? "checked" : ""}> ${food.available ? "Available" : "Hidden"}</label>
      <button class="remove-menu-item" type="button" data-remove-menu="${food.id}" aria-label="Remove ${escapeHtml(food.name)}">Remove</button>
    </div>`).join("");
}

function renderStudents() {
  const students = dashboard.students;
  byId("no-students").classList.toggle("hidden", students.length > 0);
  byId("admin-students").innerHTML = students.map((student) => {
    const name = student.name || "Student";
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return `<div class="student-row"><span class="student-avatar">${escapeHtml(initials)}</span><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(student.email || student.course || "Student account")}</small></div></div>`;
  }).join("");
}

function render() {
  renderStats();
  renderOrders();
  renderMenu();
  renderStudents();
}

async function loadDashboard() {
  const response = await fetch("api/auth.php?role=admin", { headers: { Accept: "application/json" }, credentials: "same-origin" });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error || "Could not verify the admin session. Check the server and database.");
  if (session.user?.role !== "admin") {
    location.replace("login.html?role=admin&next=admin.html");
    return;
  }
  const accountLabel = document.querySelector(".sidebar-bottom strong");
  if (accountLabel) accountLabel.textContent = session.user.name;
  dashboard = await requestAdmin();
  render();
  if (!dashboardPollStarted) {
    dashboardPollStarted = true;
    window.setInterval(refreshDashboardData, 5000);
    window.addEventListener("focus", refreshDashboardData);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshDashboardData();
    });
  }
}

async function refreshDashboardData() {
  if (dashboardRefreshInFlight || document.hidden) return;
  dashboardRefreshInFlight = true;
  try {
    dashboard = await requestAdmin();
    render();
    lastDashboardRefreshError = "";
  } catch (error) {
    if (error.message !== lastDashboardRefreshError) {
      notify("Could not refresh the dashboard. Check the server and database.");
      lastDashboardRefreshError = error.message;
    }
  } finally {
    dashboardRefreshInFlight = false;
  }
}

const signOutDialog = byId("sign-out-dialog");
byId("sign-out")?.addEventListener("click", () => signOutDialog?.showModal());
byId("cancel-sign-out")?.addEventListener("click", () => signOutDialog?.close());
byId("confirm-sign-out")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Signing out…";
  try {
    const response = await fetch("api/auth.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", role: "admin" }),
    });
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    location.replace("login.html?role=admin");
  } catch (error) {
    notify(error.message || "Could not sign out. Please try again.");
    button.disabled = false;
    button.textContent = "Sign out";
  }
});

byId("admin-orders").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-order]");
  if (!button || button.disabled) return;
  const order = dashboard.orders.find((item) => String(item.id) === button.dataset.order);
  if (!order) return;
  const nextStatus = order.status === "Pending" ? "Preparing" : order.status === "Preparing" ? "Ready" : order.status === "Ready" ? "Picked up" : null;
  if (!nextStatus) return;
  button.disabled = true;
  try {
    await requestAdmin("PATCH", { action: "advance-order", orderCode: order.id, nextStatus });
    await loadDashboard();
    notify(`Order #${order.id} updated to ${nextStatus}.`);
  } catch (error) {
    notify(error.message);
    button.disabled = false;
  }
});

byId("admin-menu").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-availability]");
  if (!input || input.disabled) return;
  input.disabled = true;
  try {
    await requestAdmin("PATCH", { action: "set-menu-availability", id: Number(input.dataset.availability), available: input.checked });
    await loadDashboard();
    const item = dashboard.menu.find((food) => food.id === Number(input.dataset.availability));
    notify(`${item?.name || "Menu item"} availability updated.`);
  } catch (error) {
    notify(error.message);
    await loadDashboard();
    input.disabled = false;
  }
});

byId("admin-menu").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-menu]");
  if (!button || button.disabled) return;
  const item = dashboard.menu.find((food) => food.id === Number(button.dataset.removeMenu));
  if (!item) return;
  pendingMenuRemovalId = item.id;
  byId("remove-menu-name").textContent = item.name;
  byId("remove-menu-dialog").showModal();
});

function closeMenuRemovalDialog() {
  byId("remove-menu-dialog").close();
  pendingMenuRemovalId = null;
}

byId("close-remove-menu").addEventListener("click", closeMenuRemovalDialog);
byId("cancel-remove-menu").addEventListener("click", closeMenuRemovalDialog);
byId("remove-menu-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = dashboard.menu.find((food) => food.id === pendingMenuRemovalId);
  if (!item) return closeMenuRemovalDialog();
  const submit = byId("confirm-remove-menu");
  if (submit.disabled) return;
  submit.disabled = true;
  submit.textContent = "Removing…";
  try {
    await requestAdmin("DELETE", { action: "delete-menu", id: item.id });
    closeMenuRemovalDialog();
    await loadDashboard();
    notify(`${item.name} removed from the menu.`);
  } catch (error) {
    notify(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = "Remove food";
  }
});

byId("add-menu-item").addEventListener("click", () => {
  const dialog = byId("menu-item-dialog");
  if (!dialog.open) dialog.showModal();
});
byId("cancel-add-menu-item").addEventListener("click", () => byId("menu-item-dialog").close());
byId("cancel-add-menu-item-secondary").addEventListener("click", () => byId("menu-item-dialog").close());
byId("menu-item-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === "true") return;
  form.dataset.submitting = "true";
  const formData = new FormData(form);
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    const result = await requestAdmin("POST", {
      action: "add-menu",
      name: formData.get("name"),
      price: formData.get("price"),
      category: formData.get("category"),
      stall: formData.get("stall"),
    });
    form.reset();
    byId("menu-item-dialog").close();
    await loadDashboard();
    notify("Menu item added.");
  } catch (error) {
    notify(error.message);
  } finally {
    delete form.dataset.submitting;
    submit.disabled = false;
  }
});

loadDashboard().catch((error) => notify(error.message));
