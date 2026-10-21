import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worldPoint} from '../dist/coordinates.js';
test('planar coordinates map to the elevated horizontal robot workspace',()=>{assert.deepEqual(worldPoint(140,180),{x:140,y:110,z:-180});});
test('a chosen elevation affects height without altering the XY location',()=>{assert.deepEqual(worldPoint(-40,70,0),{x:-40,y:0,z:-70});});
