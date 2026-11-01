const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness(trusted, spawn, createView = () => {throw new Error('not used');}, multipleSessions = true) {
  const commands = new Map();
  const errors = [];
  const vscode = {
    version:'1.95.3', ViewColumn:{Beside:2},
    workspace:{isTrusted:trusted,getConfiguration:()=>({get:(key,fallback)=>({command:'example',name:'Example',multipleSessions}[key]??fallback)})},
    window:{showErrorMessage:message=>{errors.push(message);return new Promise(()=>{});},tabGroups:{all:[]}},
    commands:{registerCommand:(name,callback)=>{commands.set(name,callback);return {dispose(){}};}}
  };
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/extension'),'utf8'),{
    module,require:name=> name==='vscode'?vscode:name==='./session'?{Session:spawn}:name==='./view'?{createView}:require(name),setTimeout
  });
  const api=module.exports.activate({subscriptions:[]});
  return {commands,errors,api};
}

test('activation never launches a command and untrusted workspace cannot spawn',async()=>{
  let spawned=0;
  const {commands,errors}=harness(false,class {constructor(){spawned++;}});
  assert.equal(spawned,0);
  await commands.get('ptyrig.new')();
  assert.equal(spawned,0);
  assert.match(errors[0],/Trust this workspace/);
});

test('a launch error does not block the command queue on notification dismissal',async()=>{
  let attempts=0;
  const {commands,errors}=harness(true,class {constructor(){attempts++;throw new Error('spawn failed');}});
  await commands.get('ptyrig.new')();
  await commands.get('ptyrig.new')();
  assert.equal(attempts,2);
  assert.equal(errors.length,2);
});


test('failed view creation terminates the newly spawned process instead of leaving an invisible session',async()=>{
  const {EventEmitter}=require('node:events');
  let closed;
  class Session extends EventEmitter {
    constructor(id){super();this.id=id;this.process={pid:123};}
    close(force){closed=force;this.closed=true;this.emit('exit');}
  }
  const {commands,api}=harness(true,Session);
  await commands.get('ptyrig.new')();
  assert.equal(closed,true);
  assert.equal(api.getSessions().length,0);
});


test('single-session launch can replace a closing process without waiting for termination',async()=>{
  const {EventEmitter}=require('node:events');
  let created=0;
  let closeView;
  class Session extends EventEmitter {
    constructor(id){super();this.id=id;this.process={pid:++created};}
    close(){this.closing=true;}
  }
  const view=(context,session,column,onActive,onClose)=>{
    closeView=onClose;
    return {viewColumn:2,visible:true,reveal(){onActive();}};
  };
  const {commands,api}=harness(true,Session,view,false);
  await commands.get('ptyrig.new')();
  closeView(false);
  await commands.get('ptyrig.new')();
  assert.equal(created,2);
  assert.equal(api.getSessions().length,2); // Retain cleanup ownership until exit.
});
