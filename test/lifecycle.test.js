const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('Windows close delegates once to ConPTY and schedules no delayed PID kill',()=>{
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/session'),'utf8'),{
    module,
    require: name=> name.startsWith('./')?require(path.resolve(__dirname,'../src',name)):require(name),
    process:{platform:'win32'},
    setTimeout(){throw new Error('Windows must not schedule a delayed kill');},
    clearTimeout(){}
  });
  let kills=0;
  const session={closed:false,closing:false,process:{kill(){kills++;}}};
  module.exports.Session.prototype.close.call(session);
  module.exports.Session.prototype.close.call(session);
  assert.equal(kills,1);
});
