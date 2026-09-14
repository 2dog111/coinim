const assert = require('node:assert/strict');
const {calculate} = require('../assets/campaign-tools.js');
for (const [plan, costs, count] of [['pilot','0','4'],['scale','0','30'],['pilot','1000','5'],['scale','1000','31']]) {
  assert.equal(calculate(plan,'1000',costs).customers,count);
}
assert.deepEqual(calculate('pilot','0.1','0.2'),{customers:'38002',total:'3,800.20'});
assert.equal(calculate('pilot','3800.01','0.01').customers,'1');
assert.equal(calculate('pilot','3800','0.01').customers,'2');
assert.equal(calculate('pilot','.01','').customers,'380000');
assert.equal(calculate('pilot','','0').empty,true);
for(const value of ['0','-1','Infinity','NaN','1e309','foo'])assert.equal(calculate('pilot',value,'0').error,'contribution');
for(const value of ['-1','Infinity','NaN','foo'])assert.equal(calculate('pilot','1000',value).error,'other');
assert.equal(calculate('pilot','0.00000001','0').customers,'380000000000');
console.log('Calculator: exact decimal arithmetic, empty/invalid inputs and both plans pass.');
