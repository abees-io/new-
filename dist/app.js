import { deliveryTotal } from "./delivery.js";
import { discountPercent } from "./pricing.js";
import { products as sampleProducts } from "./products.js";
import { loadCatalog } from "./catalog.js";
import { escapeHTML } from "./html-utils.js";
import { wholeMoney as money } from "./format.js";
let products,
  usingSamples = false;
try {
  products = await loadCatalog();
} catch {
  products = sampleProducts;
  usingSamples = true;
}

const BAG_STORAGE_KEY = "miroku-bag";

let cart = {};
try {
  const saved = JSON.parse(localStorage.getItem(BAG_STORAGE_KEY) || "{}");
  for (const p of products)
    if (Number.isInteger(saved?.[p.id]) && saved[p.id] > 0)
      cart[p.id] = Math.min(saved[p.id], 99);
} catch {}
const main = document.querySelector("main");
const page = location.pathname.endsWith("shop.html")
  ? "shop"
  : location.pathname.endsWith("cart.html")
    ? "cart"
    : "home";
document.querySelector(`[data-page="${page}"]`)?.classList.add("active");
let toastTimer;
function notify(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2600);
}
function save() {
  try {
    localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    notify("Your bag will be kept for this visit only.");
  }
  document.querySelector("#bag-count").textContent = Object.values(cart).reduce(
    (a, b) => a + b,
    0,
  );
}
function add(id) {
  const product = products.find((p) => p.id === id);
  if (!product) throw new Error("Unknown product");
  if (!usingSamples && (cart[id] || 0) >= product.stock) {
    notify("No more stock available.");
    return;
  }
  if ((cart[id] || 0) >= 99) {
    notify("Maximum quantity reached.");
    return;
  }
  cart[id] = (cart[id] || 0) + 1;
  save();
  notify("Added to your bag");
  if (page === "cart") renderCart();
}
function deliveryLabel(p) {
  return p.delivery_fee == null
    ? "Delivery charge not set"
    : Number(p.delivery_fee) === 0
      ? "Free delivery"
      : `${money(p.delivery_fee)} delivery · charged once per product`;
}
function priceDisplay(p) {
  return `<span class="price-display">${money(p.price)}${Number(p.compare_at_price) > p.price ? ` <del>${money(p.compare_at_price)}</del> <span class="discount-label">${discountPercent(p.price, p.compare_at_price)}% off</span>` : ""}</span>`;
}
function card(p) {
  return `<article><button class="product-image" data-detail="${p.id}" aria-label="View ${p.name}"><img src="${p.image}" alt="${p.name} in ${p.color}" loading="lazy">${p.tag ? `<span class="tag">${p.tag}</span>` : ""}</button><div class="product-info"><h3>${p.name}</h3>${priceDisplay(p)}</div><div class="product-meta"><p>${p.color}${!usingSamples && p.stock === 0 ? " · Sold out" : ""}</p><button class="add" ${!usingSamples && p.stock === 0 ? "disabled" : ""} data-add="${p.id}" aria-label="Add ${p.name} to bag">+</button></div></article>`;
}
if (page === "home")
  main.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow">The everyday collection</div><h1>Everyday things.<br><em>Extra good.</em></h1><p>A thoughtful edit of the things you reach for, day after day.</p><a class="primary" href="shop.html">Shop the collection</a></div><div class="hero-media"><img src="${products[0]?.image || "assets/logo.png"}" alt="${products[0]?.name || "MIROKU"}"><div class="hero-stamp">LESS,<br>BUT BETTER.</div><span class="hero-caption">${products[0]?.name || "The MIROKU collection"}</span></div></section><div class="benefits"><span><b>◇</b> Thoughtfully selected</span><span><b>＋</b> Everyday versatility</span><span><b>○</b> Simple by design</span></div><section><div class="section-head"><div><h2>Your new everyday.</h2><p>Small upgrades. A better daily routine.</p></div><a class="text-link" href="shop.html">Shop all essentials</a></div><div class="products">${products.slice(0, 4).map(card).join("") || "<p>Our collection is coming soon.</p>"}</div></section><section class="editorial"><div><div class="eyebrow">The MIROKU approach</div><h2>A little less. A little better.</h2></div><p>We believe the things you use every day deserve a little more thought. Useful pieces, simple forms, and room for what matters.</p></section>`;
let category = "All",
  sort = "featured";
function renderProducts() {
  let list = products.filter(
    (p) => category === "All" || (p.categoryKey || p.category) === category,
  );
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  document.querySelector("#product-grid").innerHTML =
    list.map(card).join("") || "<p>No products in this category yet.</p>";
  document.querySelector("#results-count").textContent =
    `${list.length} essential${list.length === 1 ? "" : "s"}`;
  document.querySelectorAll("[data-category]").forEach((b) => {
    b.classList.toggle("active", b.dataset.category === category);
    b.setAttribute("aria-pressed", String(b.dataset.category === category));
  });
}
if (page === "shop") {
  main.innerHTML = `<div class="page-heading"><div class="eyebrow">Considered essentials</div><h1>The collection.</h1><p>Good things for your everyday, all in one place.</p></div><div class="shop-tools"><div class="filters" aria-label="Product categories">${["All", ...new Set(products.map((p) => p.categoryKey || p.category))].map((c) => `<button class="filter" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("")}</div><label><span class="sort-label">Sort: </span><select id="sort" aria-label="Sort products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div><p class="shop-count" id="results-count"></p><div class="products" id="product-grid"></div>`;
  renderProducts();
  document.querySelector("#sort").addEventListener("change", (e) => {
    sort = e.target.value;
    renderProducts();
  });
}
function renderCart() {
  const entries = products.filter((p) => cart[p.id]);
  const total = entries.reduce((s, p) => s + p.price * cart[p.id], 0);
  const shipping = deliveryTotal(entries);
  main.innerHTML = `<div class="page-heading"><div class="eyebrow">Your everyday, upgraded</div><h1>Your bag<span style="color:var(--orange)">.</span></h1><p>${entries.length ? "A few good things, picked by you." : "A little room for something good."}</p></div>${entries.length ? `<div class="cart-layout"><section aria-label="Bag items">${entries.map((p) => `<article class="cart-row"><img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>${p.color} · ${money(p.price)}</p><p>${deliveryLabel(p)}</p><div class="quantity"><button data-quantity="${p.id}" data-delta="-1" aria-label="Decrease ${p.name} quantity">−</button><span>${cart[p.id]}</span><button data-quantity="${p.id}" data-delta="1" aria-label="Increase ${p.name} quantity">+</button></div><button class="remove" data-remove="${p.id}">Remove</button></div><strong>${money(p.price * cart[p.id])}</strong></article>`).join("")}<a class="text-link" href="shop.html">Continue shopping</a></section><aside class="summary"><h2>Order summary</h2><div class="summary-line"><span>Subtotal</span><span>${money(total)}</span></div><div class="summary-line"><span>Delivery</span><span>${shipping === null ? "Not set" : shipping === 0 ? "Free" : money(shipping)}</span></div><div class="summary-line total"><strong>Estimated total</strong><strong>${money(total + (shipping || 0))}${shipping === null ? " + delivery" : ""}</strong></div><a class="primary" href="checkout.html">Continue to checkout</a><small>Secure payment with Razorpay.<br>Delivery address collected at checkout.</small></aside></div>` : `<div class="empty"><h2>Your bag is waiting.</h2><p>Find your next everyday favourite.</p><a class="primary" href="shop.html">Explore the collection</a></div>`}`;
}
if (page === "cart") renderCart();
save();
const dialog = document.querySelector("#details");
document
  .querySelector(".close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.add) add(b.dataset.add);
  if (b.dataset.detail) {
    const p = products.find((p) => p.id === b.dataset.detail);
    document.querySelector("#detail-content").innerHTML =
      `<div class="product-gallery"><img id="gallery-main" src="${p.image}" alt="${p.name}"><div class="gallery-thumbnails">${(p.images || [p.image]).map((src, i) => `<button class="gallery-thumbnail" data-gallery-index="${i}" aria-label="View product photo ${i + 1}" aria-pressed="${i === 0}"><img src="${src}" alt=""></button>`).join("")}</div></div><div><div class="eyebrow">${p.category}</div><h2>${p.name}</h2><p>${p.color}</p><p>${p.description}</p><p class="price">${priceDisplay(p)}</p><p>${deliveryLabel(p)}</p><button class="primary" ${!usingSamples && p.stock === 0 ? "disabled" : ""} data-add="${p.id}">Add to bag</button>${usingSamples ? "<p>Sample collection · Product specifications to be confirmed.</p>" : ""}</div>`;
    dialog.dataset.product = p.id;
    dialog.showModal();
  }
  if (b.dataset.galleryIndex !== undefined) {
    const p = products.find((p) => p.id === dialog.dataset.product);
    const src = (p?.images || [p?.image])[Number(b.dataset.galleryIndex)];
    if (src) {
      document.querySelector("#gallery-main").src = src.replaceAll(
        "&amp;",
        "&",
      );
      dialog
        .querySelectorAll("[data-gallery-index]")
        .forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
    }
  }
  if (b.dataset.category) {
    category = b.dataset.category;
    renderProducts();
  }
  if (b.dataset.quantity) {
    const id = b.dataset.quantity;
    const stock = usingSamples
      ? 99
      : products.find((p) => p.id === id)?.stock || 0;
    cart[id] = Math.min(99, stock, cart[id] + Number(b.dataset.delta));
    if (cart[id] <= 0) delete cart[id];
    save();
    renderCart();
  }
  if (b.dataset.remove) {
    delete cart[b.dataset.remove];
    save();
    renderCart();
    notify("Removed from your bag");
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === BAG_STORAGE_KEY) location.reload();
});
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: "add_products_to_bag",
        description:
          "Stage products in the device-local MIROKU shopping bag. Does not place an order.",
        inputSchema: {
          type: "object",
          properties: {
            productIds: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 20,
            },
          },
          required: ["productIds"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute(input) {
          if (
            !Array.isArray(input?.productIds) ||
            input.productIds.length < 1 ||
            input.productIds.length > 20 ||
            input.productIds.some((id) => !products.some((p) => p.id === id))
          )
            throw new Error("Supply 1 to 20 valid product IDs.");
          input.productIds.forEach(add);
          return { bag: cart, orderPlaced: false };
        },
      }),
    ).catch(() => {});
  } catch {}
}

if (usingSamples) {
  const note = document.createElement("p");
  note.className = "catalog-note";
  note.textContent =
    "Sample collection · Our product catalogue is being prepared.";
  main.prepend(note);
}
