// A fixed charge is applied once per distinct product, regardless of quantity.
export function deliveryFee(mode, amount) {
  if (mode === "free") return 0;
  if (mode !== "paid") return null;
  const fee = Number(amount);
  if (!Number.isFinite(fee) || fee <= 0 || fee > 100000)
    throw new Error(
      "Enter a delivery charge greater than ₹0 and up to ₹100,000.",
    );
  return Math.round(fee * 100) / 100;
}
export function deliveryTotal(products) {
  if (
    products.some(
      (p) =>
        p.delivery_fee === null ||
        p.delivery_fee === undefined ||
        !Number.isFinite(Number(p.delivery_fee)) ||
        Number(p.delivery_fee) < 0,
    )
  )
    return null;
  return (
    Math.round(
      products.reduce((sum, p) => sum + Number(p.delivery_fee), 0) * 100,
    ) / 100
  );
}
