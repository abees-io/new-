import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  validateCheckout,
  signatureValid,
  config,
  recordPayment,
  database,
} from "../lib/payments.js";
const payload = () => ({
  token: "c8d96b2b-09ca-4cf5-917b-507f2da4f582",
  items: [{ id: "78831a22-a6ad-43e4-a956-70e09a8429c1", quantity: 2 }],
  customer: {
    name: "Customer",
    email: "buyer@example.com",
    phone: "9876543210",
    line1: "12 Sample Street",
    line2: "",
    city: "Kochi",
    state: "Kerala",
    pincode: "682001",
  },
});
test("valid India checkout strips untrusted prices and country", () => {
  const input = payload();
  input.amount = 1;
  input.customer.country = "Elsewhere";
  const v = validateCheckout(input);
  assert.equal(v.customer.country, "India");
  assert.equal(v.amount, undefined);
});
test("invalid quantities, duplicated products and missing address rejected", () => {
  for (const mutate of [
    (b) => (b.items[0].quantity = 0),
    (b) => (b.items[0].quantity = 1.5),
    (b) => b.items.push(b.items[0]),
    (b) => (b.customer.pincode = "000000"),
    (b) => (b.customer.phone = "1234567890"),
    (b) => (b.customer.line1 = ""),
    (b) => (b.items[0].id = "sample-product"),
  ]) {
    const b = payload();
    mutate(b);
    assert.throws(() => validateCheckout(b));
  }
});
test("signature requires exact authentic raw bytes and rejects tampering", () => {
  const raw = Buffer.from('{"event":"payment.captured"}'),
    secret = "test-secret";
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(signatureValid(raw, signature, secret), true);
  assert.equal(signatureValid(Buffer.from("{}"), signature, secret), false);
  assert.equal(signatureValid(raw, "bad", secret), false);
});
test("live keys are blocked unless live mode explicitly selected", () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, {
      PAYMENTS_MODE: "test",
      RAZORPAY_KEY_ID: "rzp_live_example",
      RAZORPAY_KEY_SECRET: "secret",
      SUPABASE_SECRET_KEY: "secret",
      SUPABASE_URL: "https://example.supabase.co",
      RAZORPAY_WEBHOOK_SECRET: "secret",
    });
    assert.throws(() => config());
    process.env.RAZORPAY_KEY_ID = "rzp_test_example";
    assert.equal(config().mode, "test");
  } finally {
    process.env = saved;
  }
});
test("authorized payment stays pending; wrong amount or order never confirmed", async () => {
  const o = { id: "id", amount: 12000, razorpay_order_id: "order_example" };
  assert.deepEqual(
    await recordPayment(o, {
      order_id: "order_example",
      amount: 12000,
      currency: "INR",
      status: "authorized",
    }),
    { status: "pending", id: "id" },
  );
  await assert.rejects(
    recordPayment(o, {
      order_id: "order_example",
      amount: 1,
      currency: "INR",
      status: "captured",
    }),
  );
  await assert.rejects(
    recordPayment(o, {
      order_id: "order_other",
      amount: 12000,
      currency: "INR",
      status: "captured",
    }),
  );
});
test("new Supabase secret key is sent as apikey and never as a JWT", async () => {
  const saved = { ...process.env },
    original = globalThis.fetch;
  try {
    Object.assign(process.env, {
      PAYMENTS_MODE: "test",
      RAZORPAY_KEY_ID: "rzp_test_example",
      RAZORPAY_KEY_SECRET: "secret",
      SUPABASE_SECRET_KEY: "sb_secret_example",
      SUPABASE_URL: "https://example.supabase.co",
      RAZORPAY_WEBHOOK_SECRET: "secret",
    });
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.apikey, "sb_secret_example");
      assert.equal(options.headers.Authorization, undefined);
      return Response.json([]);
    };
    await database("miroku_orders");
  } finally {
    globalThis.fetch = original;
    process.env = saved;
  }
});

test("malformed product entries return a validation error rather than crashing", () => {
  assert.throws(() => validateCheckout({ ...payload(), items: [null] }), {
    status: 400,
  });
});
