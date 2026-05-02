import { normalizeServerInput } from './src/shared/model.js';

const N = 100000;
const testArr = [' tag1 ', 'tag2', '', null, undefined, ' tag3 ', 'tag1', 42, ' '];
const testStr = ' tag1 , tag2, , null, undefined,  tag3 , tag1, 42,  ';

let start = performance.now();
for (let i = 0; i < N; i++) {
  normalizeServerInput({ tags: testArr });
}
let end = performance.now();
console.log(`Array Normalized: ${end - start}ms`);

start = performance.now();
for (let i = 0; i < N; i++) {
  normalizeServerInput({ tags: testStr });
}
end = performance.now();
console.log(`String Normalized: ${end - start}ms`);
