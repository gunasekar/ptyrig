const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Terminal}=require('@xterm/headless');
const {SerializeAddon}=require('@xterm/addon-serialize');
const {capture,restore}=require('../web/state');
const write=(t,data)=>new Promise(resolve=>t.write(data,resolve));
const contents=t=>Array.from({length:t.rows},(_,i)=>t.buffer.active.getLine(i).translateToString(true));
async function parity(setup,after,check=()=>{}) {
  const a=new Terminal({cols:20,rows:6,allowProposedApi:true});
  const b=new Terminal({cols:20,rows:6,allowProposedApi:true});
  const serializer=new SerializeAddon();a.loadAddon(serializer);
  try {
    await write(a,setup);
    await write(b,serializer.serialize());
    restore(b,JSON.parse(JSON.stringify(capture(a))));
    await write(a,after);await write(b,after);
    assert.deepEqual(contents(b),contents(a));
    assert.equal(b.buffer.active.cursorX,a.buffer.active.cursorX);
    assert.equal(b.buffer.active.cursorY,a.buffer.active.cursorY);
    check(a,b);
  } finally {a.dispose();b.dispose();}
}

test('restored scroll margins preserve TUI header/footer across future output',async()=>{
  await parity('\x1b[1;1HHEADER\x1b[6;1HFOOTER\x1b[2;5r\x1b[5;1H','\r\nNEW\r\nNEXT');
});
test('saved cursor, attributes, custom tab stops and hidden cursor survive snapshots',async()=>{
  await parity('\x1b[3g\x1b[1;5H\x1bH\x1b[31m\x1b[2;3H\x1b7\x1b[0m\x1b[5;1H\x1b[?25l','\x1b8X\tY',(a,b)=>{
    assert.equal(b.buffer.active.getLine(1).getCell(2).getFgColor(),a.buffer.active.getLine(1).getCell(2).getFgColor());
    assert.equal(b._core.coreService.isCursorHidden,true);
  });
});
test('normal and alternate buffer control state both survive and can be switched back',async()=>{
  await parity('\x1b[2;5r\x1b[3;2H\x1b7\x1b[?1049h\x1b[1;4r\x1b[4;1HALT','\r\nNEW\x1b[?1049l\x1b8NORMAL');
});
test('pending wrap and DEC line drawing charset survive snapshots',async()=>{
  await parity('12345678901234567890','X\x1b(0qx');
  await parity('\x1b(0q','qx');
});
test('origin-relative cursor mode survives margin restoration',async()=>{
  await parity('\x1b[2;5r\x1b[?6h\x1b[2;2H','X\r\nY');
});
