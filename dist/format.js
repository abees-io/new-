const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const money = (value) => rupees.format(value);
export const wholeMoney = (value) => wholeRupees.format(value);
export const paiseMoney = (value) => money(value / 100);
