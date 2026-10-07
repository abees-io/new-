export function catalogView(
  products,
  { category = "All", query = "", sort = "featured" } = {},
) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const list = products.filter((p) => {
    if (category !== "All" && (p.categoryKey || p.category) !== category)
      return false;
    if (!terms.length) return true;
    const text = (
      p.searchText || [p.name, p.category, p.color, p.description].join(" ")
    ).toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  else
    list.sort(
      (a, b) => Number(Boolean(b.is_offer)) - Number(Boolean(a.is_offer)),
    );
  return list;
}
