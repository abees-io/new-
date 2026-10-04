import { loadCatalog } from "./catalog.js";
import { escapeHTML } from "./html-utils.js";
import { money } from "./format.js";
import { deliveryTotal } from "./delivery.js";
const $ = (s) => document.querySelector(s),
  form = $("#address-form"),
  button = $("#pay-button");

const states = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
for (const state of states) {
  const o = document.createElement("option");
  o.value = o.textContent = state;
  form.state.append(o);
}
let items = [],
  pending = null,
  processing = false,
  finished = false;
const token = crypto.randomUUID();
const message = (text) => ($("#checkout-message").textContent = text);
async function api(path, body) {
  const r = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({
    error: "Payment service is unavailable. Please contact MIROKU.",
  }));
  if (!r.ok) throw new Error(data.error);
  return data;
}
function completed(result) {
  if (!["paid", "paid_review"].includes(result.status)) return false;
  if (finished) return true;
  finished = true;
  // Subtract only the purchased quantities, preserving later additions to the bag.
  try {
    const current = JSON.parse(localStorage.getItem("miroku-bag") || "{}");
    for (const i of items) {
      current[i.id] = Math.max(0, (current[i.id] || 0) - i.quantity);
      if (!current[i.id]) delete current[i.id];
    }
    localStorage.setItem("miroku-bag", JSON.stringify(current));
    sessionStorage.removeItem("miroku-payment");
  } catch {}
  $(".checkout-layout").hidden = true;
  $("#confirmation").hidden = false;
  $("#confirmation").innerHTML =
    `<div class="eyebrow">${pending?.mode === "test" ? "Test payment · no real money charged" : "MIROKU order"}</div><h2>${result.status === "paid" ? "Thank you. Your payment is confirmed." : "Payment received. Your order needs review."}</h2><p>${result.status === "paid" ? "We have saved your delivery address with your order." : "Please contact MIROKU to confirm availability or arrange a refund."}</p><p>Order reference: ${escapeHTML(result.id)}</p><a class="primary" href="shop.html">Continue shopping</a> <a class="text-link" href="https://wa.me/918590754639" target="_blank" rel="noopener noreferrer">Contact MIROKU</a>`;
  message("");
  return true;
}
async function checkStatus() {
  if (!pending) return false;
  return completed(
    await api("order-status", {
      orderId: pending.orderId,
      token: pending.token,
    }),
  );
}
async function verify(response) {
  message("Verifying your payment…");
  try {
    const result = await api("verify-payment", {
      ...response,
      token: pending.token,
    });
    if (completed(result)) return;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 2500));
      if (await checkStatus()) return;
    }
    message(
      "Payment confirmation is pending. Use Check payment status before trying another payment.",
    );
  } catch (e) {
    message(
      `${e.message} If you paid, check payment status or contact MIROKU before paying again.`,
    );
  } finally {
    button.disabled = false;
    button.textContent = "Check payment status";
    processing = false;
  }
}
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      reject(
        new Error(
          "Razorpay could not load. Check your connection and try again.",
        ),
      );
    };
    document.head.append(s);
  });
}
const retry = document.createElement("button");
retry.type = "button";
retry.className = "text-link";
retry.textContent = "Reopen payment window";
retry.hidden = true;
button.after(retry);
function openPayment(customer = {}) {
  const checkout = new window.Razorpay({
    key: pending.key,
    amount: pending.amount,
    currency: pending.currency,
    order_id: pending.orderId,
    name: "MIROKU",
    description: "Your everyday essentials",
    prefill: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone ? `+91${customer.phone}` : undefined,
    },
    theme: { color: "#ff5b20" },
    handler: verify,
    modal: {
      ondismiss() {
        if (finished) return;
        message("Payment window closed. Check payment status before retrying.");
        processing = false;
        button.disabled = false;
        button.textContent = "Check payment status";
        retry.hidden = false;
      },
    },
  });
  checkout.on("payment.failed", () =>
    message("Payment failed. You can retry in the payment window."),
  );
  checkout.open();
}
retry.addEventListener("click", async () => {
  if (!pending || processing) return;
  retry.disabled = true;
  try {
    if (await checkStatus()) return;
    await loadRazorpay();
    openPayment();
  } catch (e) {
    message(e.message);
  } finally {
    retry.disabled = false;
  }
});
try {
  const bag = JSON.parse(localStorage.getItem("miroku-bag") || "{}");
  const products = await loadCatalog();
  if (
    Object.entries(bag).some(
      ([id, q]) =>
        !Number.isInteger(q) ||
        q < 1 ||
        q > 99 ||
        !products.some((p) => p.id === id),
    )
  )
    throw new Error("Your bag has changed. Return to your bag and refresh it.");
  const selected = products.filter((p) => bag[p.id]);
  if (!selected.length)
    throw new Error("Your bag is empty. Add a product before checkout.");
  if (selected.some((p) => p.stock < bag[p.id]))
    throw new Error(
      "A product does not have enough stock. Please update your bag.",
    );
  const delivery = deliveryTotal(selected);
  if (delivery === null)
    throw new Error(
      "Delivery is not configured for an item. Please contact MIROKU.",
    );
  items = selected.map((p) => ({ id: p.id, quantity: bag[p.id] }));
  const subtotal = selected.reduce((sum, p) => sum + p.price * bag[p.id], 0);
  $("#checkout-summary").innerHTML =
    `<h2>Your order</h2>${selected.map((p) => `<div class="checkout-item"><span>${p.name} × ${bag[p.id]}</span><span>${money(p.price * bag[p.id])}</span></div>`).join("")}<div class="summary-line"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-line"><span>Delivery</span><span>${delivery === 0 ? "Free" : money(delivery)}</span></div><div class="summary-line total"><strong>Total</strong><strong id="checkout-total">${money(subtotal + delivery)}</strong></div><small>Prices and availability are checked again before payment.</small>`;
  button.disabled = false;
} catch (e) {
  message(e.message);
}
// Only payment references are saved for recovery. Contact details and addresses are never saved in browser storage.
try {
  pending = JSON.parse(sessionStorage.getItem("miroku-payment") || "null");
  if (pending) {
    items = pending.items;
    button.disabled = false;
    button.textContent = "Check payment status";
    retry.hidden = false;
    form
      .querySelectorAll("input,select")
      .forEach((el) => (el.required = false));
    await checkStatus();
  }
} catch {
  message(
    "Could not check your previous payment. Contact MIROKU if money was deducted.",
  );
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (processing) return;
  processing = true;
  button.disabled = true;
  let paymentOpened = false;
  try {
    if (pending) {
      await checkStatus();
      if (!$("#confirmation").hidden) return;
      message(
        "Payment is still pending. If money was deducted, contact MIROKU before paying again.",
      );
      return;
    }
    const customer = Object.fromEntries(new FormData(form));
    const order = await api("create-order", { items, customer, token });
    $("#checkout-total").textContent = money(order.amount / 100);
    await loadRazorpay();
    pending = { ...order, token, items };
    sessionStorage.setItem("miroku-payment", JSON.stringify(pending));
    form.querySelectorAll("input,select").forEach((el) => {
      el.required = false;
      el.disabled = true;
    });
    message(
      order.mode === "test"
        ? "Test mode: no real money will be charged."
        : "Complete your payment securely with Razorpay.",
    );
    openPayment(customer);
    paymentOpened = true;
  } catch (err) {
    message(err.message);
  } finally {
    if (!paymentOpened) {
      processing = false;
      button.disabled = items.length === 0;
    }
  }
});
