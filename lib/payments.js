import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

export class CheckoutError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function signatureValid(message,signature,secret){
  if(typeof signature!=='string'||! /^[a-f0-9]{64}$/i.test(signature))return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(message).digest());
}
export function config(){
  const e=process.env,mode=e.PAYMENTS_MODE||'test';
  if(!['test','live'].includes(mode)||!e.RAZORPAY_KEY_ID?.startsWith(`rzp_${mode}_`)||!e.RAZORPAY_KEY_SECRET||!e.SUPABASE_SECRET_KEY||!e.SUPABASE_URL||!e.RAZORPAY_WEBHOOK_SECRET)throw new CheckoutError('Checkout is being set up. Please contact MIROKU on WhatsApp.',503);
  return {mode,key:e.RAZORPAY_KEY_ID,secret:e.RAZORPAY_KEY_SECRET,url:e.SUPABASE_URL.replace(/\/$/,''),dbKey:e.SUPABASE_SECRET_KEY};
}
export function validateCheckout(body){
  if(!/^[a-f0-9-]{36}$/i.test(body?.token||''))throw new CheckoutError('Refresh checkout and try again.');
  const items=body.items;
  if(!Array.isArray(items)||!items.length||items.length>20||new Set(items.map(i=>i.id)).size!==items.length||items.some(i=>! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99))throw new CheckoutError('Your bag is invalid. Please return to the shop.');
  const c=body.customer||{},customer={};
  for(const [field,max] of Object.entries({name:120,email:254,phone:10,line1:200,line2:200,city:100,state:100,pincode:6})){
    if(typeof c[field]!=='string'||c[field].trim().length>max||(!c[field].trim()&&field!=='line2'))throw new CheckoutError('Complete your contact details and delivery address.');
    customer[field]=c[field].trim();
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||! /^[6-9]\d{9}$/.test(customer.phone)||! /^[1-9]\d{5}$/.test(customer.pincode))throw new CheckoutError('Enter a valid email, Indian mobile number and six-digit PIN code.');
  customer.country='India';
  return {items,customer,token:body.token};
}
export async function database(path,{method='GET',body}={}){
  const c=config();
  const response=await fetch(`${c.url}/rest/v1/${path}`,{method,headers:{apikey:c.dbKey,Authorization:`Bearer ${c.dbKey}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok){
    const publicErrors=['Product unavailable','Delivery not configured','Not enough stock','Checkout expired'];
    const known=publicErrors.find(m=>result?.message?.includes(m));
    throw new CheckoutError(known?`${known}. Please update your bag or contact MIROKU.`:'The store could not save your order. Please try again later.',known?409:503);
  }
  return result;
}
export async function razorpay(path,{method='GET',body}={}){
  const c=config();
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method,headers:{Authorization:`Basic ${Buffer.from(`${c.key}:${c.secret}`).toString('base64')}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok)throw new CheckoutError('Payment service is temporarily unavailable. Please try again.',502);
  return result;
}
export async function findOrder(id){
  if(!/^order_[a-zA-Z0-9]+$/.test(id||''))throw new CheckoutError('Invalid payment order.');
  const rows=await database(`miroku_orders?razorpay_order_id=eq.${id}&select=*`);
  if(!rows?.[0])throw new CheckoutError('Order not found.',404);
  return rows[0];
}
export async function recordPayment(order,payment){
  if(payment.order_id!==order.razorpay_order_id||payment.amount!==order.amount||payment.currency!=='INR')throw new CheckoutError('Payment details do not match this order.',409);
  if(payment.status!=='captured')return {status:'pending',id:order.id};
  const result=await database('rpc/miroku_complete_order',{method:'POST',body:{p_order_id:order.id,p_payment_id:payment.id,p_amount:payment.amount}});
  return {status:result.status,id:order.id};
}
export function reply(res,status,data){res.setHeader('Cache-Control','no-store');res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
export function rawBody(req,limit=20000){
  // data/end listeners also work with Vercel's restored request-body stream.
  return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>limit){reject(new CheckoutError('Request too large.',413));return;}chunks.push(Buffer.from(chunk));});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});
}
export async function bodyJSON(req){
  const raw=await rawBody(req);
  try{return JSON.parse(raw.toString());}catch{throw new CheckoutError('Invalid request.');}
}
export function endpoint(fn){return async(req,res)=>{try{if(req.method!=='POST')throw new CheckoutError('Method not allowed.',405);if(req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==process.env.SITE_URL)throw new CheckoutError('Open checkout from the MIROKU website.',403);await fn(req,res);}catch(e){reply(res,e.status||503,{error:e instanceof CheckoutError?e.message:'Checkout is temporarily unavailable. Please try again.'});}};}
