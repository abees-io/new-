import { createAdminClient, isAdmin } from "./admin-service.js";
import { paiseMoney as currency } from "./format.js";
import { escapeHTML } from "./html-utils.js";
const $ = (s) => document.querySelector(s);

const pageSize = 50;
let db,
  ascending = false,
  offset = 0,
  requestVersion = 0,
  loaded = [],
  loading = false;
const message = (text) => ($("#orders-message").textContent = text);
function clearOrders() {
  requestVersion++;
  loaded = [];
  $("#order-list").replaceChildren();
  $("#orders-workspace").hidden = true;
}
function render() {
  $("#orders-count").textContent =
    `${loaded.length} paid order${loaded.length === 1 ? "" : "s"} shown · ${ascending ? "Oldest" : "Latest"} first`;
  $("#order-list").innerHTML = loaded.length
    ? loaded
        .map((o) => {
          const c = o.customer || {},
            items = Array.isArray(o.items) ? o.items : [];
          return `<li class="order-entry"><div class="order-summary"><div><h2>${escapeHTML(c.name || "Customer")}${o.mode === "test" ? '<span class="order-test">TEST</span>' : ""}</h2><p>${items.map((i) => `${escapeHTML(i.name)} × ${escapeHTML(i.quantity)}`).join(" · ")}</p><p class="order-meta">${escapeHTML(new Date(o.created_at).toLocaleString("en-IN"))}</p></div><div class="order-payment"><span class="order-paid">paid</span><strong>${currency(o.amount)}</strong></div></div>${o.status === "paid_review" ? '<p class="order-review">Payment received. Review stock and fulfilment, or arrange a refund.</p>' : ""}<details><summary>Customer and delivery details</summary><address class="order-address">${[c.line1, c.line2, c.city, c.state, c.pincode, c.country].filter(Boolean).map(escapeHTML).join("<br>")}</address><p>${escapeHTML(c.email || "")} · ${escapeHTML(c.phone || "")}</p><p class="order-meta">Order: ${escapeHTML(o.id)}</p><p class="order-meta">Payment: ${escapeHTML(o.razorpay_payment_id || "")}</p></details></li>`;
        })
        .join("")
    : '<li class="order-empty">No paid orders yet. Completed payments will appear here.</li>';
}
async function loadOrders(reset = true) {
  const version = ++requestVersion;
  if (reset) {
    offset = 0;
    loaded = [];
    $("#order-list").replaceChildren();
    $("#orders-count").textContent = "Loading paid orders…";
  }
  loading = true;
  $("#more-orders").disabled = true;
  $("#more-orders").hidden = true;
  $("#refresh-orders").disabled = true;
  message("");
  try {
    const { data, error } = await db
      .from("miroku_orders")
      .select(
        "id,customer,items,amount,mode,status,razorpay_payment_id,created_at",
      )
      .in("status", ["paid", "paid_review"])
      .order("created_at", { ascending })
      .order("id", { ascending })
      .range(offset, offset + pageSize - 1);
    if (version !== requestVersion) return;
    if (error)
      throw new Error(
        "Could not load orders. Check your connection and try Refresh.",
      );
    loaded.push(...data);
    offset += data.length;
    render();
    $("#more-orders").hidden = data.length < pageSize;
  } catch (e) {
    if (version === requestVersion) {
      message(e.message);
      $("#orders-count").textContent = "Orders could not be loaded.";
      if (!reset) $("#more-orders").hidden = false;
    }
  } finally {
    if (version === requestVersion) {
      loading = false;
      $("#more-orders").disabled = false;
      $("#refresh-orders").disabled = false;
    }
  }
}
$("#order-sort").addEventListener("click", () => {
  ascending = !ascending;
  $("#order-sort").textContent = ascending
    ? "Oldest first ↑"
    : "Latest first ↓";
  $("#order-sort").setAttribute(
    "aria-label",
    `Sort orders: ${ascending ? "oldest" : "latest"} first`,
  );
  loadOrders();
});
$("#refresh-orders").addEventListener("click", () => loadOrders());
$("#more-orders").addEventListener("click", () => {
  if (!loading) loadOrders(false);
});
$("#orders-sign-out").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) {
    message("Could not sign out. Please try again.");
    return;
  }
  clearOrders();
  location.replace("/admin");
});
try {
  db = await createAdminClient();
  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      clearOrders();
      location.replace("/admin?next=orders");
    }
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) {
    location.replace("/admin?next=orders");
  } else {
    const authorized = await isAdmin(db, user);
    if (!authorized)
      throw new Error("This account does not have store admin access.");
    $("#orders-workspace").hidden = false;
    await loadOrders();
  }
} catch (e) {
  clearOrders();
  message(
    e.message || "Could not connect to the admin service. Please refresh.",
  );
}
