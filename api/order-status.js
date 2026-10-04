import {endpoint,bodyJSON,findOrder,tokenHash,CheckoutError,reply,razorpay,recordPayment} from '../lib/payments.js';
export default endpoint(async(req,res)=>{const b=await bodyJSON(req),order=await findOrder(b.orderId);if(typeof b.token!=='string'||tokenHash(b.token)!==order.token_hash)throw new CheckoutError('Order access denied.',403);
  if(order.status==='pending'){const payments=await razorpay(`orders/${order.razorpay_order_id}/payments`);const captured=payments.items?.find(p=>p.status==='captured');if(captured){reply(res,200,await recordPayment(order,captured));return;}}
  reply(res,200,{id:order.id,status:order.status});});
