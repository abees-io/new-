import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/loading.js',import.meta.url),'utf8').replace('export function finishLoading','function finishLoading');
function setup({first=true,reduced=false,width=64,measurementFails=false}={}){
 const timers=new Map(),classes=new Set();let id=0,removed=0;
 const content={inert:false};
 const loader={classList:{add:value=>classes.add(value)},style:{setProperty(){}},querySelector:()=>({getBoundingClientRect(){if(measurementFails)throw Error('Geometry unavailable');return{width};}}),getBoundingClientRect:()=>({width:1920,height:1080}),remove(){removed++;}};
 const context={performance:{now:()=>0},sessionStorage:{getItem:()=>first?null:'1',setItem(){}},document:{querySelector:()=>loader,querySelectorAll:()=>[content],body:{classList:{add(){},remove(){}}}},window:{matchMedia:()=>({matches:reduced})},setTimeout(fn,delay){timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key)};
 vm.runInNewContext(source,context);
 return {context,classes,content,get removed(){return removed;},run(delay){const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`Expected timer ${delay}`);timers.delete(entry[0]);entry[1].fn();}};
}
test('loader is removed without animation events and restores page interaction',()=>{const app=setup();app.context.finishLoading();app.context.finishLoading();app.run(1500);assert.ok(app.classes.has('is-closing'));app.run(3300);assert.equal(app.removed,1);assert.equal(app.content.inert,false);});
test('independent watchdog removes loader when page initialization never finishes',()=>{const app=setup();app.run(12000);assert.equal(app.removed,1);assert.equal(app.content.inert,false);app.context.finishLoading();assert.equal(app.removed,1);});
test('bad or failing logo measurements cannot leave a blocking overlay',()=>{for(const options of [{width:0},{measurementFails:true}]){const app=setup(options);app.context.finishLoading();app.run(1500);assert.equal(app.removed,1);assert.equal(app.content.inert,false);}});
test('later page loads use immediate close with quick cleanup',()=>{const app=setup({first:false});app.context.finishLoading();assert.ok(app.classes.has('is-closing'));app.run(200);assert.equal(app.removed,1);});
test('reduced motion removes loader immediately',()=>{const app=setup({reduced:true});app.context.finishLoading();assert.equal(app.removed,1);assert.equal(app.content.inert,false);});
