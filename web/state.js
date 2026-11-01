/* xterm 6.0.0 snapshot supplement. Keep headless/renderer versions identical.
 * The serialize addon omits margins, saved cursor, tab stops and some modes.
 * Isolate the pinned xterm internals here; parity tests must pass on upgrades.
 */
(function (root) {
  const XTERM_VERSION = '6.0.0';
  const modeKeys = ['applicationCursorKeys', 'applicationKeypad', 'bracketedPasteMode', 'origin', 'reverseWraparound', 'sendFocus', 'wraparound', 'cursorStyle', 'cursorBlink'];
  function internals(terminal) {
    const core = terminal._core;
    if (!core?._bufferService?.buffers || !core.coreService || !core._inputHandler || !core._charsetService) {
      throw new Error('Unsupported xterm snapshot internals; run state parity tests before upgrading.');
    }
    return core;
  }
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const attributes = value => ({ fg: value.fg, bg: value.bg, ext: value.extended.ext });
  function applyAttributes(target, value) {
    target.fg = value.fg; target.bg = value.bg; target.extended.ext = value.ext;
    // Link IDs refer to a different terminal's link registry; never transfer them.
    target.extended.urlId = 0;
  }
  function capture(terminal) {
    const core = internals(terminal);
    const buffers = {};
    for (const name of ['normal', 'alt']) {
      const buffer = core._bufferService.buffers[name];
      buffers[name] = {
        x: buffer.x, y: buffer.y, scrollTop: buffer.scrollTop, scrollBottom: buffer.scrollBottom,
        savedX: buffer.savedX, savedRow: buffer.savedY - buffer.ybase,
        savedAttributes: attributes(buffer.savedCurAttrData), savedCharset: copy(buffer.savedCharset), tabs: copy(buffer.tabs)
      };
    }
    return {
      version: 1, buffers,
      attributes: attributes(core._inputHandler._curAttrData),
      modes: Object.fromEntries(modeKeys.filter(key => core.coreService.decPrivateModes[key] !== undefined).map(key => [key, core.coreService.decPrivateModes[key]])),
      cursorHidden: core.coreService.isCursorHidden,
      charset: { glevel: core._charsetService.glevel, charsets: copy(core._charsetService._charsets), active: copy(core._charsetService.charset) }
    };
  }
  function restore(terminal, state) {
    if (!state || state.version !== 1) return;
    const core = internals(terminal);
    for (const name of ['normal', 'alt']) {
      const value = state.buffers[name];
      const buffer = core._bufferService.buffers[name];
      buffer.x = Math.min(value.x, terminal.cols); // cols is a pending wrap, not an off-screen cursor.
      buffer.y = Math.min(value.y, terminal.rows - 1);
      buffer.scrollTop = Math.min(value.scrollTop, terminal.rows - 1);
      buffer.scrollBottom = Math.min(value.scrollBottom, terminal.rows - 1);
      buffer.savedX = Math.min(value.savedX, terminal.cols);
      buffer.savedY = Math.max(0, buffer.ybase + value.savedRow);
      buffer.savedCharset = copy(value.savedCharset);
      buffer.tabs = copy(value.tabs);
      applyAttributes(buffer.savedCurAttrData, value.savedAttributes);
    }
    applyAttributes(core._inputHandler._curAttrData, state.attributes);
    for (const key of modeKeys) {
      if (state.modes[key] !== undefined) core.coreService.decPrivateModes[key] = state.modes[key];
    }
    core.coreService.isCursorHidden = state.cursorHidden;
    core._charsetService.glevel = state.charset.glevel;
    core._charsetService._charsets = copy(state.charset.charsets);
    core._charsetService.charset = copy(state.charset.active);
    terminal.refresh?.(0, terminal.rows - 1);
  }
  if (typeof module === 'object') module.exports = { capture, restore, XTERM_VERSION };
  else root.PtyrigState = { capture, restore, XTERM_VERSION };
})(globalThis);
