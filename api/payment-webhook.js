import {config as paymentConfig,signatureValid,CheckoutError,findOrder,razorpay,recordPayment,reply} from '../lib/payments.js';
export default async function handler(req,res){try{
  if(req.method!=='POST')throw new CheckoutError('Method not allowed.',405);paymentConfig();
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1000000)throw new CheckoutError('Request too large.',413);chunks.push(Buffer.from(chunk));}const raw=Buffer.concat(chunks);
  if(!signatureValid(raw,req.headers['x-razorpay-signature'],process.env.RAZORPAY_WEBHOOK_SECRET))throw new CheckoutError('Invalid signature.',403);
  const event=JSON.parse(raw.toString());
  if(['payment.captured','order.paid'].includes(event.event)){
    const p=event.payload?.payment?.entity;
    if(p?.order_id){let order;try{order=await findOrder(p.order_id);}catch(e){if(e.status===404){reply(res,200,{received:true});return;}throw e;}
      await recordPayment(order,await razorpay(`payments/${p.id}`));}
  }
  reply(res,200,{received:true});
}catch(e){reply(res,e.status||503,{error:e instanceof CheckoutError?e.message:'Webhook processing failed. Retry required.'});}};
export const config = {api:{bodyParser:false}};
