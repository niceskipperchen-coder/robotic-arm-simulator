import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grasp,updateObjects} from '../dist/manipulation.js';
const block=()=>({id:'A',x:180,y:80,z:12,vz:0,size:24});
test('gripper acquires a block only when aligned in XY and height',()=>{assert.equal(grasp([block()],{x:183,y:78,z:14}),'A');assert.equal(grasp([block()],{x:180,y:80,z:40}),null);assert.equal(grasp([block()],{x:200,y:80,z:12}),null);});
test('held blocks follow the tool in all three axes',()=>{const p=updateObjects([block()],'A',{x:210,y:-40,z:90},.1)[0];assert.equal(p.x,210);assert.equal(p.y,-40);assert.equal(p.z,90);assert.equal(p.vz,0);});
test('released block falls and settles on the floor without penetrating it',()=>{let objects=[{...block(),z:90}];objects=updateObjects(objects,null,{},.1);assert.ok(objects[0].z<90);for(let i=0;i<100;i++)objects=updateObjects(objects,null,{},.016);assert.equal(objects[0].z,12);assert.equal(objects[0].vz,0);});
test('grasp selects the closest block when more than one is in tolerance',()=>{assert.equal(grasp([block(),{...block(),id:'B',x:185}],{x:186,y:80,z:12}),'B');});
