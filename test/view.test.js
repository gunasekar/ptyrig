const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
function setup() {
  const handlers = {};
  const sent = [];
  let options;
  const listen = name => callback => { handlers[name] = callback; return {dispose() {}}; };
  const panel = {
    webview: { cspSource:'test-source', asWebviewUri: uri => uri, postMessage: message => { sent.push(message); return Promise.resolve(true); }, onDidReceiveMessage:listen('message') },
    onDidChangeViewState:listen('state'), onDidDispose:listen('dispose'), dispose() { handlers.dispose(); }
  };
  const vscode = {
    Uri: {joinPath:(root,...parts)=>[root,...parts].join('/')},
    window: { createWebviewPanel:(type,title,column,opts)=>{options=opts; return panel;} }
  };
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/view'),'utf8'), { module, require:name=>name==='vscode'?vscode:require(name),setTimeout,clearTimeout });
  const session=Object.assign(new EventEmitter(),{ title:'Example',closed:false, snapshot:()=> 'SNAPSHOT', write:(...args)=>{session.input=args;}, resize:(...args)=>{session.size=args;} });
  const closed=[];
  module.exports.createView({extensionUri:'/extension'},session,2,()=>{},hiding=>closed.push(hiding));
  return {handlers,sent,panel,session,closed,options};
}

test('webview bounds buffered output and resynchronizes only after matching acknowledgement',async()=>{
  const {handlers,sent,session,panel}=setup();
  handlers.message({type:'ready'});
  assert.equal(sent.length,1);
  session.emit('data','x'.repeat(300*1024));
  handlers.message({type:'ack',id:sent[0].id+10});
  assert.equal(sent.length,1);
  handlers.message({type:'ack',id:sent[0].id});
  assert.equal(sent.length,2);
  assert.equal(sent[1].reset,true);
  assert.equal(sent[1].data,'SNAPSHOT');
  handlers.message({type:'ack',id:sent[1].id});
  session.emit('data','tail');
  await wait(30);
  assert.equal(sent[2].data,'tail');
  assert.equal(sent[2].reset,false);
  panel.hideSession();
});

test('disposed webviews cannot forward input and release their session listener',()=>{
  const {handlers,panel,session,closed}=setup();
  handlers.message({type:'input',data:'hello',binary:true});
  assert.equal(session.input[0],'hello');
  panel.hideSession();
  assert.equal(closed[0],true);
  assert.equal(session.listenerCount('data'),0);
  handlers.message({type:'input',data:'untrusted stale message'});
  assert.equal(session.input[0],'hello');
});

test('webview has no workspace resource access, command URIs or external script policy',()=>{
  const {options,panel}=setup();
  assert.equal(options.enableCommandUris,undefined);
  assert.equal(options.localResourceRoots.length,4);
  assert.ok(options.localResourceRoots.every(root=>root.startsWith('/extension/')));
  assert.match(panel.webview.html,/default-src 'none'/);
  assert.match(panel.webview.html,/base-uri 'none'; form-action 'none'/);
  assert.doesNotMatch(panel.webview.html, /https?:|unsafe-eval/);
  panel.dispose();
});


test('live titles update only their own tab and stop updating after hide',()=>{
  const {panel,session}=setup();
  session.emit('title','1: Agent (codex)');
  assert.equal(panel.title,'1: Agent (codex)');
  panel.hideSession();
  assert.equal(session.listenerCount('title'),0);
  session.emit('title','1: Agent (claude)');
  assert.equal(panel.title,'1: Agent (codex)');
});
