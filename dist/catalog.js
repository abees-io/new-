import { SUPABASE_URL, SUPABASE_KEY } from "./supabase-config.js";
import { escapeHTML, safeImage } from "./html-utils.js";
export function storefrontProduct(p) {
  return {
    ...p,
    searchText: [p.name, p.category, p.color, p.description].join(" "),
    categoryKey: p.category,
    price: Number(p.price),
    stock: Number(p.stock),
    name: escapeHTML(p.name),
    category: escapeHTML(p.category),
    color: escapeHTML(p.color),
    tag: escapeHTML(p.tag),
    description: escapeHTML(p.description),
    image: escapeHTML(safeImage(p.image)),
    images: (Array.isArray(p.images) && p.images.length ? p.images : [p.image])
      .map(safeImage)
      .filter(Boolean)
      .slice(0, 4)
      .map(escapeHTML),
  };
}
const CACHE_KEY = `miroku-catalog:${SUPABASE_URL}`;
const CACHE_AGE = 15000;
let refreshing;

async function fetchCatalog() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miroku_products?select=*&published=eq.true&order=created_at.desc`,
    { headers: { apikey: SUPABASE_KEY }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Catalogue unavailable");
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error("Catalogue unavailable");
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ time: Date.now(), products }),
    );
  } catch {}
  return products.map(storefrontProduct);
}

export async function loadCatalog({ useCache = false } = {}) {
  if (useCache) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      const age = Date.now() - cached?.time;
      if (age >= 0 && age < CACHE_AGE && Array.isArray(cached.products)) {
        // Only published catalogue data is cached; checkout never uses this shortcut.
        if (!refreshing)
          refreshing = fetchCatalog()
            .catch(() => {})
            .finally(() => {
              refreshing = undefined;
            });
        return cached.products.map(storefrontProduct);
      }
    } catch {}
  }
  return fetchCatalog();
}
