// Dynamic templates start with the launcher name. Fixed templates keep their text.
// Truncate the inserted live value, preserving all surrounding template text.
function sessionTitle(id, template, title, numbered, fallback = 'PTYrig') {
  const clean = (template.replace(/[\x00-\x1f\x7f]/g, '').trim() || 'PTYrig').slice(0, 120);
  const characters = Array.from((title || '').replace(/[\x00-\x1f\x7f]/g, '').trim());
  const value = (characters.length > 32 ? characters.slice(0, 31).join('') + '…' : characters.join('')) || '…';
  const initial = (fallback.replace(/[\x00-\x1f\x7f]/g, '').trim() || 'PTYrig').slice(0, 120);
  const label = (!characters.length && clean.includes('$TITLE') ? initial : clean.replaceAll('$TITLE', () => value)).slice(0, 180);
  return numbered ? `${id}: ${label}` : label;
}

module.exports = { sessionTitle };
