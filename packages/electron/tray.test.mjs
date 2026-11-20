import { expect, mock, test } from 'bun:test';
import { EventEmitter } from 'node:events';

let attachedMenu;
let lastTooltip;
class Tray extends EventEmitter {
  setIgnoreDoubleClickEvents() {}
  setImage() {}
  setTitle() {}
  setToolTip(tooltip) { lastTooltip = tooltip; }
  setContextMenu(menu) { attachedMenu = menu; }
  destroy() {}
}
mock.module('electron', () => ({
  Tray,
  Menu: { buildFromTemplate: () => new EventEmitter() },
  nativeImage: { createFromPath: () => ({ isEmpty: () => true }) },
}));
const { createTrayController } = await import('./tray.mjs');

test('the native menu lifecycle reports each opening through the renderer action route', () => {
  const actions = [];
  const tray = createTrayController({ idleIconPath: '', unseenIconPath: '', breathIconPaths: [], onAction: action => actions.push(action) });
  try {
    tray.update({ sessions: [] });
    expect(actions).toEqual([]);
    attachedMenu.emit('menu-will-show');
    attachedMenu.emit('menu-will-close');
    attachedMenu.emit('menu-will-show');
    expect(actions).toEqual([{ type: 'menu-opened' }, { type: 'menu-opened' }]);
  } finally { tray.destroy(); }
});

test('the tooltip follows the requested locale with correct plural forms', () => {
  const snapshot = { sessions: [{ id: 's1', title: 'One', status: 'busy', unseen: 2, hasError: false, subtitle: '', directory: '' }], approvals: [{ id: 'a1' }] };
  const tray = createTrayController({ idleIconPath: '', unseenIconPath: '', breathIconPaths: [], onAction: () => {} });
  try {
    tray.update(snapshot, 'en');
    expect(lastTooltip).toBe('OpenChamber — 1 session · 1 awaiting approval, 1 working, 2 unread');
    tray.update(snapshot, 'ru');
    expect(lastTooltip).toBe('OpenChamber — 1 сессия · 1 ожидает подтверждения, 1 работает, 2 непрочитанные');
  } finally { tray.destroy(); }
});

test('the tooltip falls back to English for an unknown locale', () => {
  const tray = createTrayController({ idleIconPath: '', unseenIconPath: '', breathIconPaths: [], onAction: () => {} });
  try {
    tray.update({ sessions: [] }, 'xx');
    expect(lastTooltip).toBe('OpenChamber — no active sessions');
  } finally { tray.destroy(); }
});
