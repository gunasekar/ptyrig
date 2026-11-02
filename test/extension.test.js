const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness(trusted, spawn, createView = () => {throw new Error('not used');}, multipleSessions = true) {
  const commands = new Map();
  const errors = [];
  const statusItems = [];
  let displayName = 'Example';
  let configListener;
  const vscode = {
    version:'1.95.3', ViewColumn:{Beside:2}, StatusBarAlignment:{Right:2,Left:1},
    workspace:{isTrusted:trusted,onDidChangeConfiguration:listener=>{configListener=listener;return {dispose(){}};},getConfiguration:()=>({get:(key,fallback)=>({command:'example',name:displayName,sessionTitle:'Session Example',multipleSessions}[key]??fallback)})},
    window:{
      onDidChangeActiveTextEditor:()=>({dispose(){}}),
      showErrorMessage:message=>{errors.push(message);return new Promise(()=>{});},
      tabGroups:{all:[]},
      createStatusBarItem:(alignment,priority)=>{
        const item={alignment,priority,name:'',text:'',tooltip:'',command:undefined,visible:false,show(){this.visible=true;},dispose(){}};
        statusItems.push(item);
        return item;
      }
    },
    commands:{registerCommand:(name,callback)=>{commands.set(name,callback);return {dispose(){}};}}
  };
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/extension'),'utf8'),{
    module,require:name=> name==='vscode'?vscode:name==='./session'?{Session:spawn}:name==='./view'?{createView}:require(name),setTimeout
  });
  const subscriptions=[];
  const api=module.exports.activate({subscriptions});
  return {commands,errors,api,statusItems,subscriptions,rename(name){displayName=name;configListener({affectsConfiguration:key=>key==='ptyrig.name'});}};
}

test('activation never launches a command and untrusted workspace cannot spawn',async()=>{
  let spawned=0;
  const {commands,errors}=harness(false,class {constructor(){spawned++;}});
  assert.equal(spawned,0);
  await commands.get('ptyrig.new')();
  assert.equal(spawned,0);
  assert.match(errors[0],/Trust this workspace/);
});

test('activation shows a status bar entry that toggles sessions',()=>{
  const {statusItems,subscriptions}=harness(true,class {constructor(){throw new Error('not used');}});
  assert.equal(statusItems.length,1);
  assert.equal(statusItems[0].visible,true);
  assert.equal(statusItems[0].command,'ptyrig.toggle');
  assert.equal(statusItems[0].text,'$(ptyrig-logo) Example');
  assert.equal(statusItems[0].alignment,2);
  assert.equal(statusItems[0].color,undefined);
  assert.ok(subscriptions.includes(statusItems[0]));
});

test('launcher labels are bounded plain text with a fallback for empty names',()=>{
  const {statusItems,rename}=harness(true,class {});
  rename(' \n\x00 ');
  assert.equal(statusItems[0].text,'$(ptyrig-logo) PTYrig');
  rename('Agents $(zap)');
  assert.equal(statusItems[0].text,'$(ptyrig-logo) Agents \\$(zap)');
  rename('x'.repeat(200));
  assert.equal(statusItems[0].name.length,120);
});

test('display name updates the launcher without changing the session title',async()=>{
  const {EventEmitter}=require('node:events');
  let title;
  class Session extends EventEmitter {
    constructor(id,name){super();this.id=id;this.process={pid:123};title=name;}
  }
  const {commands,statusItems,rename}=harness(true,Session,()=>({viewColumn:2,visible:true}));
  rename('Agents');
  assert.equal(statusItems[0].text,'$(ptyrig-logo) Agents');
  assert.equal(statusItems[0].tooltip,'Hide/Show Agents');
  await commands.get('ptyrig.new')();
  assert.equal(title,'Session Example');
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
