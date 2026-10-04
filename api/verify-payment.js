import {
  endpoint,
  bodyJSON,
  findOrder,
  signatureValid,
  config,
  tokenHash,
  CheckoutError,
  razorpay,
  recordPayment,
  reply,
} from "../lib/payments.js";
export default endpoint(async (req, res) => {
  const b = await bodyJSON(req),
    order = await findOrder(b.razorpay_order_id);
  if (
    typeof b.token !== "string" ||
    tokenHash(b.token) !== order.token_hash ||
    !/^pay_[a-zA-Z0-9]+$/.test(b.razorpay_payment_id || "") ||
    !signatureValid(
      `${order.razorpay_order_id}|${b.razorpay_payment_id}`,
      b.razorpay_signature,
      config().secret,
    )
  )
    throw new CheckoutError("Payment verification failed.", 403);
  reply(
    res,
    200,
    await recordPayment(
      order,
      await razorpay(`payments/${b.razorpay_payment_id}`),
    ),
  );
});
