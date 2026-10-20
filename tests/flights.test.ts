import assert from 'node:assert/strict';
import { validateSearch, normalizeOffers, comparison } from '../lib/flights.ts';
const now=new Date('2026-10-19T12:00:00Z');
assert.equal(validateSearch({destination:'LIS',outbound:'2027-01-15',inbound:'2027-01-22'},now).destination,'LIS');
for(const q of [{destination:'XXX',outbound:'2027-01-15',inbound:'2027-01-22'},{destination:'LIS',outbound:'2027-02-30',inbound:'2027-03-05'},{destination:'LIS',outbound:'2026-10-18',inbound:'2027-01-01'},{destination:'LIS',outbound:'2027-01-15',inbound:'2027-01-12'}])assert.throws(()=>validateSearch(q,now));
const offers=normalizeOffers({best_flights:[{type:'Round trip',price:600,flights:[{airline:'Delta'}]},{type:'Round trip',price:0},{type:'One way',price:100}],other_flights:[{type:'Round trip',price:450,flights:[{airline:'TAP'},{airline:'TAP'}]}]});assert.equal(offers.length,2);assert.equal(offers[0].price,450);assert.equal(offers[0].airlines,'TAP');assert.equal(offers[0].stops,1);
const latest={id:'c',price:400,observed:now.getTime()};const result=comparison([{id:'a',price:600,observed:now.getTime()-1000},{id:'b',price:400,observed:now.getTime()-2000},latest,{id:'old',price:9000,observed:now.getTime()-91*86400000}],latest);assert.equal(result.average,500);assert.equal(result.dropPercent,20);assert.equal(result.count,2);assert.equal(comparison([latest],latest).average,null);
console.log('Passed search validation, offer filtering, cheapest fare sorting, and 90-day comparisons.');
