const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sessionTitle}=require('../src/titles');

test('placeholder preserves parentheses and numbering while fixed names remain fixed',()=>{
  assert.equal(sessionTitle(1,'($TITLE)','claude',true),'1: (claude)');
  assert.equal(sessionTitle(2,'Agent ($TITLE)','codex',true),'2: Agent (codex)');
  assert.equal(sessionTitle(2,'Agent ($TITLE)','codex',false),'Agent (codex)');
  assert.equal(sessionTitle(1,'My Agent','claude',true),'1: My Agent');
  assert.equal(sessionTitle(1,'Agent ($TITLE)',undefined,true,'Agents'),'1: Agents');
  assert.equal(sessionTitle(1,'($TITLE) + ($TITLE)','claude',true),'1: (claude) + (claude)');
  assert.equal(sessionTitle(1,'$TITLE','claude',true),'1: claude');
  assert.equal(sessionTitle(1,'raw $TITLE','claude',true),'1: raw claude');
  assert.equal(sessionTitle(1,'[$TITLE] — $TITLE','claude',false),'[claude] — claude');
  assert.equal(sessionTitle(1,'$TITLE','',false,'Trails'),'Trails');
  assert.equal(sessionTitle(1,'$TITLE','$& $TITLE',false),'$& $TITLE');
});

test('live titles allow task text while removing controls and bounding labels',()=>{
  assert.equal(sessionTitle(1,'Agent ($TITLE)','Fixing login bug',false),'Agent (Fixing login bug)');
  assert.equal(sessionTitle(1,'($TITLE)','\n\t',false,'Trails'),'Trails');
  assert.equal(sessionTitle(1,'($TITLE)','hello\x07world',false),'(helloworld)');
  assert.equal(sessionTitle(1,'($TITLE)','x'.repeat(32),false),'('+'x'.repeat(32)+')');
  assert.equal(sessionTitle(1,'($TITLE)','x'.repeat(33),false),'('+'x'.repeat(31)+'…)');
  assert.equal(sessionTitle(1,'($TITLE)','😀'.repeat(33),false),'('+'😀'.repeat(31)+'…)');
});
