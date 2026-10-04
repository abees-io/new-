import { SUPABASE_URL, SUPABASE_KEY } from "./supabase-config.js";
import { escapeHTML, safeImage } from "./html-utils.js";
export function storefrontProduct(p) {
  return {
    ...p,
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
export async function loadCatalog() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miroku_products?select=*&published=eq.true&order=created_at.desc`,
    { headers: { apikey: SUPABASE_KEY }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Catalogue unavailable");
  return (await response.json()).map(storefrontProduct);
}
