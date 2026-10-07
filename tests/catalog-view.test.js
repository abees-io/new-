import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogView} from '../dist/catalog-view.js';
const products=[{id:'one',name:'Everyday bag',category:'Carry',color:'Orange',description:'Cotton tote',price:200},{id:'two',name:'Desk light',category:'Home',color:'White',description:'Reading lamp',price:700,is_offer:true},{id:'three',name:'Travel bag',category:'Carry',color:'White',description:'Canvas tote',price:400}];
test('featured offers come first without dropping regular products or mutating the catalogue',()=>{assert.deepEqual(catalogView(products).map(p=>p.id),['two','one','three']);assert.equal(products[0].id,'one');});
test('search handles case, whitespace, multiple terms and descriptive fields',()=>{assert.deepEqual(catalogView(products,{query:'  WHITE  tote '}).map(p=>p.id),['three']);assert.equal(catalogView(products,{query:'reading'}).length,1);assert.equal(catalogView(products,{query:'missing'}).length,0);assert.equal(catalogView(products,{query:'   '}).length,3);});
test('category and price sorting work with search',()=>{assert.deepEqual(catalogView(products,{category:'Carry',query:'bag',sort:'high'}).map(p=>p.id),['three','one']);assert.deepEqual(catalogView(products,{sort:'low'}).map(p=>p.id),['one','three','two']);});
test('raw search text supports names escaped for HTML display',()=>{assert.equal(catalogView([{name:'A &amp; B',searchText:'A & B',price:1}],{query:'A & B'}).length,1);});
