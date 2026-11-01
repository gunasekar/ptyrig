/* Shared with the headless terminal: only the session model answers queries. */
(function (root) {
  function suppressQueries(terminal) {
    const registrations = [];
    const csi = id => registrations.push(terminal.parser.registerCsiHandler(id, () => true));
    for (const prefix of ['', '>']) csi({ prefix, final: 'c' });
    for (const prefix of ['', '?']) {
      csi({ prefix, final: 'n' });
      csi({ prefix, intermediates: '$', final: 'p' });
    }
    registrations.push(terminal.parser.registerDcsHandler({ intermediates: '$', final: 'q' }, () => true));
    registrations.push(terminal.parser.registerCsiHandler({ final: 't' }, params => [14, 16, 18].includes(params[0])));
    return { dispose() { for (const registration of registrations) registration.dispose(); } };
  }
  if (typeof module === 'object') module.exports = { suppressQueries };
  else root.PtyrigProtocol = { suppressQueries };
})(globalThis);
