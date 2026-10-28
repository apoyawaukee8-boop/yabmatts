const { getAdminFoods, getCart, saveCart, getFavorites, saveFavorites, peso } = TamBayts;
const grid = document.querySelector("#food-grid");
const search = document.querySelector("#food-search");
const toast = document.querySelector("#toast");
let currentCategory = "all";
let sortLowToHigh = false;
const categoryMeta = {
  meals: { label: "Rice meals" },
  drinks: { label: "Drinks" },
  snacks: { label: "Snacks" },
  healthy: { label: "Healthy" },
  pasta: { label: "Pasta" },
};
const foodPhotos = {
  "adobo": "https://images.squarespace-cdn.com/content/v1/61a291c576178478d97ddeef/5f99cb47-1134-4302-8222-5700089b3892/FB_IMG_1691803423566.jpg?format=1500w",
  "beef steak": "https://shopsuki.ph/cdn/shop/collections/amies-beef-steak-bistek-tagalog-recipe-main-photo_3_1024x.jpg?v=1608616298",
  "buffalo wings": "https://housing.k-state.edu/images/dining/Overtime-Wings-WEB.png",
  "bottled iced tea": "https://parade.com/.image/w_3840%2Cq_auto%3Agood%2Cc_limit/ODowMDAwMDAwMDAwNzA1NTI2/iced-teabhofack2getty-images.jpg",
  "carbonara": "https://www.nestlegoodnes.com/ph/sites/default/files/styles/1_1_768px_width/public/comments/2024-12/Carbonara.jpg.webp?itok=m95aT8lD",
  "cheese sticks": "https://i0.wp.com/www.angsarap.net/wp-content/uploads/2014/01/cheese-sticks.jpg",
  "chicken pastil": "https://i0.wp.com/growupgrowold.com/wp-content/uploads/2024/11/Chicken-Pastil-Grow-Up-Grow-Old-1-edited-1.jpg?resize=960%2C720&ssl=1",
  "fruit bowl": "https://iod.keplrstatic.com/api/ar_1%2Cc_crop%2Cg_north/c_fill%2Cdpr_auto%2Cf_auto%2Cq_70%2Cw_750/mon_marche/4730_MELANGE_GOURMAND_400G.jpg",
  "hotsilog": "https://snapcalorie-webflow-website.s3.us-east-2.amazonaws.com/media/food_pics_v2/medium/hotsilog.jpg",
  "hungsilog": "https://images.deliveryhero.io/image/fd-ph/products/18822853.jpg",
  "siomai rice": "https://cdn.ordermo.ph/photos/resto/haGAhWsg/menu/5ASqoJn7-vqHjLnSb.jpg?v=1658207386645",
  "sisig": "https://images.deliveryhero.io/image/foodpanda/recipes/sisig-recipe-2.jpg",
  "tapsilog": "https://purposefoods.ph/cdn/shop/products/tapsilog2.jpg?v=1669191513&width=533",
  "yema": "https://istoryangkusina.wordpress.com/wp-content/uploads/2011/06/yema3.jpg",
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function renderCategories(foods) {
  const available = [...new Set(foods.map((food) => String(food.category).toLowerCase()))];
  const preferred = ["meals", "drinks", "snacks", "healthy", "pasta"];
  const categories = [...preferred.filter((category) => available.includes(category)), ...available.filter((category) => !preferred.includes(category)).sort()];
  const labelFor = (category) => categoryMeta[category]?.label || category.replace(/\b\w/g, (letter) => letter.toUpperCase());
  document.querySelector(".category-row").innerHTML = [
    `<button class="category ${currentCategory === "all" ? "active" : ""}" data-category="all"><span>All</span></button>`,
    ...categories.map((category) => `<button class="category ${currentCategory === category ? "active" : ""}" data-category="${escapeHtml(category)}"><span>${escapeHtml(labelFor(category))}</span></button>`),
  ].join("");
}

function photoFor(food) {
  const name = String(food.name).trim().toLowerCase();
  return food.imageUrl || foodPhotos[name] || "";
}

function updateBadge() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = count;
    badge.classList.toggle("has-items", count > 0);
  });
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2000);
}
function renderFood() {
  const term = search.value.trim().toLowerCase();
  const cart = getCart();
  const favorites = new Set(getFavorites());
  let shown = getAdminFoods().filter((food) => food.available && (currentCategory === "all" || food.category === currentCategory) && food.name.toLowerCase().includes(term));
  if (sortLowToHigh) shown = [...shown].sort((first, second) => first.price - second.price);
  document.querySelector("#results-message").textContent = term
    ? `${shown.length} result${shown.length === 1 ? "" : "s"} for “${search.value.trim()}”`
    : sortLowToHigh ? "Sorted by lowest price" : "";
  grid.innerHTML = shown.length ? shown.map((food) => {
    const item = cart.find((cartItem) => cartItem.name === food.name);
    const isFavorite = favorites.has(food.name);
    const safeName = escapeHtml(food.name);
    const imageUrl = photoFor(food);
    const foodImage = imageUrl
      ? `<img class="food-image" src="${escapeHtml(imageUrl)}" alt="${safeName}" loading="lazy" onerror="const p=this.parentElement;this.remove();p.classList.add('food-photo-missing');const s=document.createElement('span');s.className='food-image-placeholder';s.textContent='Photo unavailable';p.prepend(s)">`
      : '<span class="food-image-placeholder">Photo unavailable</span>';
    const quantityControl = item
      ? `<div class="quantity-control" aria-label="Quantity for ${safeName}"><button data-decrease="${safeName}" aria-label="Remove one ${safeName}">−</button><strong>${item.quantity} in cart</strong><button data-increase="${safeName}" aria-label="Add one ${safeName}">+</button></div>`
      : `<button class="add-button" data-add="${safeName}" aria-label="Add ${safeName} to cart">＋ Add</button>`;
    return `<article class="food-card ${item ? "is-added" : ""}"><div class="food-photo ${imageUrl ? "" : "food-photo-missing"}">${foodImage}<span class="stall-badge">${escapeHtml(food.stall || "Campus pick")}</span></div><div class="card-body"><h2 class="food-name">${safeName}</h2><button class="favorite ${isFavorite ? "is-favorite" : ""}" data-favorite="${safeName}" aria-label="Favorite ${safeName}">${isFavorite ? "★" : "☆"}</button><span class="price">${peso(Number(food.price) || 0)}</span>${quantityControl}</div></article>`;
  }).join("") : '<p class="empty-results">No meals found. Try another search.</p>';
  updateBadge();
}
async function loadDatabaseMenu() {
  try {
    const response = await fetch("api/menu.php", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const result = await response.json();
    if (!Array.isArray(result.menu) || result.menu.length === 0) return;
    TamBayts.saveAdminFoods(result.menu);
    renderCategories(result.menu);
    renderFood();
  } catch {}
}
document.querySelector(".category-row").addEventListener("click", (event) => {
  const button = event.target.closest(".category");
  if (!button) return;
  currentCategory = button.dataset.category;
  document.querySelectorAll(".category").forEach((category) => category.classList.toggle("active", category === button));
  renderFood();
});
document.querySelector("#filter-button").addEventListener("click", () => {
  sortLowToHigh = !sortLowToHigh;
  document.querySelector("#filter-button").innerHTML = sortLowToHigh ? "Lowest price <span>↑</span>" : "Filters <span>⌄</span>";
  renderFood();
});
grid.addEventListener("click", (event) => {
  const favorite = event.target.closest("[data-favorite]");
  const control = event.target.closest("[data-add], [data-increase], [data-decrease]");
  if (favorite) {
    const favorites = getFavorites();
    const name = favorite.dataset.favorite;
    saveFavorites(favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name]);
    renderFood();
  }
  if (!control) return;
  const name = control.dataset.add || control.dataset.increase || control.dataset.decrease;
  const cart = getCart();
  const item = cart.find((cartItem) => cartItem.name === name);
  const isDecrease = control.hasAttribute("data-decrease");
  if (isDecrease && item) item.quantity -= 1;
  else if (item) item.quantity += 1;
  else cart.push({ name, quantity: 1 });
  saveCart(cart.filter((cartItem) => cartItem.quantity > 0));
  showToast(isDecrease && item?.quantity === 0 ? `${name} removed from your cart` : `${name} quantity updated`);
  renderFood();
});
search.addEventListener("input", renderFood);
renderCategories(getAdminFoods());
renderFood();
loadDatabaseMenu();
