import {
  endpoint,
  bodyJSON,
  validateCheckout,
  tokenHash,
  database,
  razorpay,
  config,
  reply,
} from "../lib/payments.js";
export default endpoint(async (req, res) => {
  const { items, customer, token } = validateCheckout(await bodyJSON(req));
  const c = config();
  const order = await database("rpc/miroku_create_order", {
    method: "POST",
    body: {
      p_items: items,
      p_customer: customer,
      p_token_hash: tokenHash(token),
      p_mode: c.mode,
    },
  });
  let remoteId = order.razorpay_order_id;
  if (!remoteId) {
    const remote = await razorpay("orders", {
      method: "POST",
      body: {
        amount: order.amount,
        currency: "INR",
        receipt: order.id,
        notes: { miroku_order: order.id },
      },
    });
    // Attach under a row lock. Concurrent retries always return the first attached order.
    remoteId = await database("rpc/miroku_attach_payment_order", {
      method: "POST",
      body: { p_order_id: order.id, p_remote_id: remote.id },
    });
  }
  reply(res, 200, {
    id: order.id,
    orderId: remoteId,
    amount: order.amount,
    currency: "INR",
    key: c.key,
    mode: c.mode,
  });
});
