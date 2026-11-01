const {test}=require('node:test');
const assert=require('node:assert/strict');
const {directCommand,commandLabel,sessionTitle}=require('../src/titles');

test('direct command names omit arguments and paths, preserving quoted launches',()=>{
  for (const [command,name] of [
    ['claude --resume','claude'],['/opt/homebrew/bin/codex --model example','codex'],
    ['"/path with spaces/bin/claude" --resume','claude'],["'/path with spaces/bin/claude'",'claude'],
    ['TOKEN=example exec claude','claude'],['env FOO=bar codex','codex'],['exec gemini','gemini']
  ]) assert.equal(directCommand(command),name,command);
  assert.equal(directCommand('"C:\\Program Files\\Codex\\codex.exe" --resume','win32'),'codex.exe');
});

test('compound or ambiguous shell launches wait for an explicit command report',()=>{
  for(const command of ['agent=$(printf codex | fzf) && exec "$agent"','printf hello | codex','claude; codex','"$AGENT"','`choose-agent`','"unfinished','env -u TOKEN claude']) assert.equal(directCommand(command),undefined,command);
});

test('placeholder preserves parentheses and numbering while fixed names remain fixed',()=>{
  assert.equal(sessionTitle(1,'($CMD)','claude',true),'1: (claude)');
  assert.equal(sessionTitle(2,'Agent ($CMD)','codex',true),'2: Agent (codex)');
  assert.equal(sessionTitle(2,'Agent ($CMD)','codex',false),'Agent (codex)');
  assert.equal(sessionTitle(1,'My Agent','claude',true),'1: My Agent');
  assert.equal(sessionTitle(1,'Agent ($CMD)',undefined,true),'1: Agent (…)');
  assert.equal(sessionTitle(1,'($CMD) + ($CMD)','claude',true),'1: (claude) + (claude)');
  assert.equal(sessionTitle(1,'raw $CMD','claude',true),'1: raw $CMD');
});

test('reported commands are display-only bounded names, never arguments or control sequences',()=>{
  for (const value of ['claude --resume','codex\x1b]2;spoof\x07','codex\n','$(touch owned)','<script>','..','x'.repeat(81),null]) assert.equal(commandLabel(value),undefined);
  assert.equal(commandLabel('/opt/homebrew/bin/claude'),'claude');
});
