import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stepJoint} from '../dist/motion.js';
test('joint movement obeys angular speed times elapsed time',()=>{assert.equal(stepJoint(0,90,60,.1),6);assert.equal(stepJoint(0,-90,60,.1),-6);});
test('motion stops at the commanded angle without overshooting',()=>{assert.equal(stepJoint(10,12,60,.1),12);});
test('shoulder crosses the angle boundary along the shorter path',()=>{assert.equal(stepJoint(179,-179,10,.1,true),-180);});
test('relative elbow angle does not wrap through an alternate configuration',()=>{assert.equal(stepJoint(170,-170,30,1),140);});
test('zero elapsed time leaves the joint stationary',()=>{assert.equal(stepJoint(0,90,60,0),0);});
