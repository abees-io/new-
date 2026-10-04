export function discountPercent(price, original) {
  return Number(original) > Number(price) && Number(price) > 0
    ? Math.round((1 - Number(price) / Number(original)) * 100)
    : 0;
}
export function discountedPrice(original, percent) {
  const base = Number(original),
    discount = Number(percent);
  if (
    !Number.isFinite(base) ||
    base <= 0 ||
    base > 10000000 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount >= 100
  )
    throw new Error(
      "Enter an original price and a discount from 0 to less than 100%.",
    );
  const result = Math.round(base * (1 - discount / 100) * 100) / 100;
  if (result <= 0)
    throw new Error("Discounted price must be greater than zero.");
  return result;
}
