// Parse only simple launches. Compound shell commands must report their choice;
// never execute a command or inspect unrelated processes to determine a label.
function directCommand(command, platform = process.platform) {
  const words = [];
  let word = '';
  let quote = '';
  let escaped = false;
  for (const char of command.trim()) {
    if (escaped) { word += char; escaped = false; continue; }
    if (char === '\\' && quote !== "'" && platform !== 'win32') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; else word += char; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if ('|;&<>()`\n\r'.includes(char)) return undefined;
    if (/\s/.test(char)) { if (word) { words.push(word); word = ''; } }
    else word += char;
  }
  if (escaped || quote) return undefined;
  if (word) words.push(word);
  while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
  if (['exec', 'command'].includes(words[0])) words.shift();
  if (words[0] === 'env') {
    words.shift();
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
    if (words[0] === '--') words.shift();
  }
  if (words[0]?.startsWith('-')) return undefined;
  return commandLabel(words[0]);
}

function commandLabel(value) {
  if (typeof value !== 'string' || value.length > 1024 || /[\x00-\x1f\x7f]/.test(value)) return undefined;
  const name = value.split(/[\\/]/).at(-1);
  return /^[\p{L}\p{N}_.+@-]{1,80}$/u.test(name || '') && /[\p{L}\p{N}]/u.test(name) ? name : undefined;
}

function sessionTitle(id, template, command, numbered) {
  const clean = (template.replace(/[\x00-\x1f\x7f]/g, '').trim() || 'PTYrig').slice(0, 120);
  const label = clean.replaceAll('($CMD)', `(${command || '…'})`).slice(0, 180);
  return numbered ? `${id}: ${label}` : label;
}

module.exports = { directCommand, commandLabel, sessionTitle };
