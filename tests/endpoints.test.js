import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createHmac } from "node:crypto";
import createOrder from "../api/create-order.js";
import verifyPayment from "../api/verify-payment.js";
import webhook from "../api/payment-webhook.js";
import { tokenHash } from "../lib/payments.js";
const token = "c8d96b2b-09ca-4cf5-917b-507f2da4f582";
const order = {
  id: "78831a22-a6ad-43e4-a956-70e09a8429c1",
  amount: 125000,
  token_hash: tokenHash(token),
  razorpay_order_id: "order_demo",
  status: "pending",
};
const payment = {
  id: "pay_demo",
  order_id: "order_demo",
  amount: 125000,
  currency: "INR",
  status: "captured",
};
function request(body, headers = {}) {
  const r = Readable.from([JSON.stringify(body)]);
  r.method = "POST";
  r.headers = { host: "store.test", origin: "https://store.test", ...headers };
  return r;
}
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(text) {
      this.result = JSON.parse(text);
    },
  };
}
function setup() {
  Object.assign(process.env, {
    PAYMENTS_MODE: "test",
    RAZORPAY_KEY_ID: "rzp_test_example",
    RAZORPAY_KEY_SECRET: "secret",
    SUPABASE_SECRET_KEY: "db-secret",
    SUPABASE_URL: "https://example.supabase.co",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
  });
}
test("create order uses database amount rather than browser amount", async () => {
  setup();
  const original = globalThis.fetch;
  let remoteAmount;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    if (url.includes("miroku_create_order"))
      return Response.json({ ...order, razorpay_order_id: null });
    if (url.endsWith("/orders")) {
      remoteAmount = body.amount;
      return Response.json({ id: "order_demo" });
    }
    if (url.includes("miroku_attach")) return Response.json("order_demo");
    throw new Error("Unexpected network request");
  };
  try {
    const r = response();
    await createOrder(
      request({
        token,
        amount: 1,
        items: [{ id: order.id, quantity: 1 }],
        customer: {
          name: "Customer",
          email: "buyer@example.com",
          phone: "9876543210",
          line1: "Sample street",
          line2: "",
          city: "Kochi",
          state: "Kerala",
          pincode: "682001",
        },
      }),
      r,
    );
    assert.equal(r.statusCode, 200);
    assert.equal(remoteAmount, 125000);
    assert.equal(r.result.amount, 125000);
    assert.equal(r.result.secret, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
test("browser payment verifies signature and provider before recording payment", async () => {
  setup();
  const original = globalThis.fetch;
  let recorded = 0;
  globalThis.fetch = async (url) => {
    if (url.includes("miroku_orders?")) return Response.json([order]);
    if (url.includes("/payments/")) return Response.json(payment);
    if (url.includes("miroku_complete")) {
      recorded++;
      return Response.json({ status: "paid" });
    }
    throw new Error("Unexpected network request");
  };
  try {
    const sig = createHmac("sha256", "secret")
      .update("order_demo|pay_demo")
      .digest("hex");
    const body = {
      token,
      razorpay_order_id: "order_demo",
      razorpay_payment_id: "pay_demo",
      razorpay_signature: sig,
    };
    const r = response();
    await verifyPayment(request(body), r);
    assert.equal(r.result.status, "paid");
    assert.equal(recorded, 1);
    const bad = response();
    await verifyPayment(
      request({ ...body, razorpay_signature: "a".repeat(64) }),
      bad,
    );
    assert.equal(bad.statusCode, 403);
    assert.equal(recorded, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("signed webhook processes payment; tampered webhook rejected", async () => {
  setup();
  const event = {
    event: "payment.captured",
    payload: { payment: { entity: payment } },
  };
  const sig = createHmac("sha256", "webhook-secret")
    .update(JSON.stringify(event))
    .digest("hex");
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("miroku_orders?")) return Response.json([order]);
    if (url.includes("/payments/")) return Response.json(payment);
    if (url.includes("miroku_complete"))
      return Response.json({ status: "paid" });
    throw new Error("Unexpected network request");
  };
  try {
    const good = response();
    await webhook(request(event, { "x-razorpay-signature": sig }), good);
    assert.equal(good.statusCode, 200);
    const bad = response();
    await webhook(
      request(
        { ...event, event: "order.paid" },
        { "x-razorpay-signature": sig },
      ),
      bad,
    );
    assert.equal(bad.statusCode, 403);
  } finally {
    globalThis.fetch = original;
  }
});
test("cross-origin checkout denied before database access", async () => {
  const r = response();
  await createOrder(request({}, { origin: "https://evil.test" }), r);
  assert.equal(r.statusCode, 403);
});
