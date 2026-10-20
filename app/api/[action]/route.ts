import { env } from 'cloudflare:workers';
import { validateSearch, normalizeOffers, comparison } from '../../../lib/flights';
export const dynamic='force-dynamic';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const db=()=> (env as any).DB;
async function secretKey(){const secret=(env as any).KEY_ENCRYPTION_SECRET;if(!secret)throw new Error('Encryption not configured');return crypto.subtle.importKey('raw',new TextEncoder().encode(secret).slice(0,32),'AES-GCM',false,['encrypt','decrypt']);}
async function seal(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await secretKey(),new TextEncoder().encode(value));return JSON.stringify({iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted))});}
async function apiKey(){if((env as any).SERPAPI_API_KEY)return (env as any).SERPAPI_API_KEY;const row=await db().prepare("SELECT value FROM settings WHERE id='serpapi'").first();if(!row)return null;const value=JSON.parse(row.value);const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(value.iv)},await secretKey(),new Uint8Array(value.data));return new TextDecoder().decode(decoded);}
async function summary(){const month=new Date().toISOString().slice(0,7);const setting=await db().prepare("SELECT id FROM settings WHERE id='serpapi'").first();const used=await db().prepare('SELECT count FROM usage WHERE month=?').bind(month).first();const rows=await db().prepare('SELECT * FROM observations ORDER BY observed DESC LIMIT 2000').all();return {configured:!!((env as any).SERPAPI_API_KEY||setting),requests:used?.count||0,limit:240,month,observations:rows.results.map((r:any)=>({...r,offers:JSON.parse(r.offers)}))};}
export async function GET(request:Request){try{return json(await summary());}catch{return json({error:'Unable to load saved fares. Please try again.'},503);}}
export async function POST(request:Request,context:any){
 const action=(await context.params).action;
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin request required.'},403);
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large.'},413);
 let body;try{body=JSON.parse(await request.text());}catch{return json({error:'Invalid request.'},400);}
 if(action==='settings'){
  if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in to save your API key.'},401);
  if(typeof body.key!=='string'||!/^[a-zA-Z0-9_-]{20,200}$/.test(body.key.trim()))return json({error:'Enter your SerpApi API key.'},400);
  try{const encrypted=await seal(body.key.trim());await db().prepare("INSERT INTO settings(id,value) VALUES('serpapi',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(encrypted).run();return json({ok:true});}catch{return json({error:'Could not save the key. Please try again.'},503);}
 }
 if(action!=='search')return json({error:'Not found'},404);
 let query;try{query=validateSearch(body);}catch{return json({error:'Choose a destination and future return-trip dates within one year.'},400);}
 const {destination,outbound,inbound}=query;const id=[destination,outbound,inbound].join(':');let locked=false;
 try{
  const key=await apiKey();if(!key)return json({error:'Connect your SerpApi key first.'},409);
  const cached=await db().prepare('SELECT * FROM observations WHERE route=? AND outbound=? AND inbound=? ORDER BY observed DESC LIMIT 1').bind(destination,outbound,inbound).first();
  if(cached&&Date.now()-cached.observed<86400000)return json({cached:true,observation:{...cached,offers:JSON.parse(cached.offers)}});
  const now=Date.now();const lock=await db().prepare('INSERT INTO searches(id,started) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET started=excluded.started WHERE searches.started < ? RETURNING id').bind(id,now,now-120000).first();
  if(!lock)return json({error:'This route is already being checked. Try again shortly.'},429);locked=true;
  const month=new Date().toISOString().slice(0,7);
  const reserved=await db().prepare('INSERT INTO usage(month,count) VALUES(?,1) ON CONFLICT(month) DO UPDATE SET count=count+1 WHERE count<240 RETURNING count').bind(month).first();
  if(!reserved)return json({error:'The site’s 240-request calendar-month limit has been reached.'},429);
  const params=new URLSearchParams({engine:'google_flights',departure_id:'ATL',arrival_id:destination,outbound_date:outbound,return_date:inbound,type:'1',travel_class:'1',adults:'1',currency:'USD',hl:'en',gl:'us',sort_by:'2',api_key:key});
  let result:any;try{const response=await fetch('https://serpapi.com/search.json?'+params,{signal:AbortSignal.timeout(55000)});if(!response.ok)return json({error:response.status===401?'SerpApi rejected the API key. Check your key in Connection settings.':response.status===429?'SerpApi’s quota or rate limit was reached.':'SerpApi could not complete the search. Try again later.'},502);result=await response.json();}catch{return json({error:'SerpApi timed out or could not be reached. This attempt is counted conservatively toward the site limit.'},502);}
  if(result.error||result.search_metadata?.status==='Error')return json({error:'SerpApi returned no successful result. Check your key, plan balance, and travel dates.'},502);
  const offers=normalizeOffers(result);if(!offers.length)return json({error:'No valid round-trip fares were returned for these dates. No price was recorded.'},404);
  const observed=Date.now(),oid=crypto.randomUUID(),price=offers[0].price;
  await db().prepare('INSERT INTO observations(id,route,outbound,inbound,observed,price,offers,source) VALUES(?,?,?,?,?,?,?,?)').bind(oid,destination,outbound,inbound,observed,price,JSON.stringify(offers),'SerpApi / Google Flights').run();
  const history=await db().prepare('SELECT * FROM observations WHERE route=? AND outbound=? AND inbound=? AND observed>=? ORDER BY observed DESC').bind(destination,outbound,inbound,observed-90*86400000).all();
  const observation={id:oid,route:destination,outbound,inbound,observed,price,offers,source:'SerpApi / Google Flights'};
  return json({cached:false,observation,comparison:comparison(history.results,observation)});
 }catch{return json({error:'The search could not be completed. Please try again later.'},503);}finally{if(locked)await db().prepare('DELETE FROM searches WHERE id=?').bind(id).run();}
}
