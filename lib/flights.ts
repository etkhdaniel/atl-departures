export const destinations = ['LIS','HND','CDG','LHR','ICN','FCO','BCN','MEX','YVR','SJU'];
export function validateSearch(body:any, now = new Date()) {
 const {destination,outbound,inbound}=body||{};
 const date=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s;
 if(!destinations.includes(destination)||!date(outbound)||!date(inbound)||outbound<=now.toISOString().slice(0,10)||inbound<=outbound||Date.parse(inbound)-now.getTime()>365*86400000) throw new Error('Choose a listed destination and valid future return-trip dates within one year.');
 return {destination,outbound,inbound};
}
export function normalizeOffers(data:any) {
 const all=[...(Array.isArray(data.best_flights)?data.best_flights:[]),...(Array.isArray(data.other_flights)?data.other_flights:[])];
 return all.filter(o=>o.type==='Round trip'&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>0).map(o=>({price:o.price,duration:typeof o.total_duration==='number'?o.total_duration:null,airlines:[...new Set((o.flights||[]).map((f:any)=>f.airline).filter((x:any)=>typeof x==='string'))].join(', '),stops:Math.max(0,(o.flights||[]).length-1)})).sort((a,b)=>a.price-b.price).slice(0,12);
}
export function comparison(history:any[], latest:any) {
 const prior=history.filter(x=>x.id!==latest.id&&x.observed<latest.observed&&x.observed>=latest.observed-90*86400000);
 const avg=prior.length?prior.reduce((s,x)=>s+x.price,0)/prior.length:null;
 return {average:avg,count:prior.length,dropPercent:avg?((avg-latest.price)/avg)*100:null};
}
