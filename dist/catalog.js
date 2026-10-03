import {SUPABASE_URL, SUPABASE_KEY} from './supabase-config.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeImage(value) {
  try {const url=new URL(value); return url.protocol==='https:' ? url.href : '';} catch {return '';}
}
export function storefrontProduct(p) {
  return {...p, categoryKey:p.category, price:Number(p.price), stock:Number(p.stock), name:escapeHTML(p.name), category:escapeHTML(p.category), color:escapeHTML(p.color), tag:escapeHTML(p.tag), description:escapeHTML(p.description), image:escapeHTML(safeImage(p.image))};
}
export async function loadCatalog() {
  const response=await fetch(`${SUPABASE_URL}/rest/v1/miroku_products?select=*&published=eq.true&order=created_at.desc`, {headers:{apikey:SUPABASE_KEY},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error('Catalogue unavailable');
  return (await response.json()).map(storefrontProduct);
}
