// The tray submenu drops "Allow always" for a permission that carries no save
// patterns (#4698). The tray rebuilds its menu only when `trayMenuKey` changes,
// so the flag has to be part of that signature too, or a snapshot whose only
// delta is `canSave` leaves the previous submenu on screen.
import { describe, expect, test } from 'bun:test';

import { buildTrayMenuTemplate, trayMenuKey } from './tray-menu.mjs';

const permission = (id, canSave) => ({
  kind: 'permission', id, sessionId: 's1', sessionTitle: 'Session',
  label: `bash: ${id}`, directory: '/repo', canSave,
});

const snapshotWith = (...approvals) => ({ instanceName: 'OpenChamber', sessions: [], approvals });

const submenuLabels = (snapshot, id, locale = 'en') => buildTrayMenuTemplate(snapshot, { onAction: () => {}, statusIcons: {}, locale })
  .filter((row) => Array.isArray(row.submenu) && String(row.label).includes(id))
  .flatMap((row) => row.submenu.filter((item) => item.label).map((item) => item.label));

describe('tray approval submenu', () => {
  test('offers "Allow always" only when the request can be remembered', () => {
    const snapshot = snapshotWith(permission('savable', true), permission('one-off', false));

    expect(submenuLabels(snapshot, 'savable')).toEqual(['Allow once', 'Allow always', 'Deny', 'Open in app']);
    expect(submenuLabels(snapshot, 'one-off')).toEqual(['Allow once', 'Deny', 'Open in app']);
  });

  test('the menu key changes when canSave is the only change, so the submenu never goes stale', () => {
    const savable = trayMenuKey(snapshotWith(permission('p1', true)));
    const oneOff = trayMenuKey(snapshotWith(permission('p1', false)));

    expect(oneOff).not.toBe(savable);
    expect(trayMenuKey(snapshotWith(permission('p1', false)))).toBe(oneOff);
  });
});

describe('tray menu localization', () => {
  const richSnapshot = () => ({
    instanceName: 'OpenChamber',
    sessions: [{ id: 's1', title: 'My session', status: 'busy', unseen: 0, hasError: false, subtitle: '', directory: '/repo' }],
    approvals: [permission('p1', true)],
    usage: { mode: 'remaining', groups: [{ provider: 'Anthropic', status: '', rows: [{ label: 'Tokens', value: '10' }] }] },
  });

  const labels = (template) => template.filter((row) => row.label).map((row) => row.label);

  test('renders Russian labels when locale is ru', () => {
    const template = buildTrayMenuTemplate(richSnapshot(), { onAction: () => {}, statusIcons: {}, locale: 'ru' });
    const flat = labels(template);

    expect(flat).toContain('Требует внимания');
    expect(flat).toContain('Сессии');
    expect(flat).toContain('Новая сессия');
    expect(flat).toContain('Новый мини-чат');
    expect(flat).toContain('Использование (Осталось)');
    expect(submenuLabels(richSnapshot(), 'bash: p1')).toEqual(['Allow once', 'Allow always', 'Deny', 'Open in app']);
    expect(submenuLabels(richSnapshot(), 'bash: p1', 'ru')).toEqual(['Разрешить один раз', 'Разрешить всегда', 'Запретить', 'Открыть в приложении']);
  });

  test('the menu key changes with locale, so switching language rebuilds the menu', () => {
    const snapshot = snapshotWith(permission('p1', true));

    expect(trayMenuKey(snapshot, 'ru')).not.toBe(trayMenuKey(snapshot, 'en'));
    expect(trayMenuKey(snapshot, 'ru')).toBe(trayMenuKey(snapshot, 'ru'));
    expect(trayMenuKey(snapshot)).toBe(trayMenuKey(snapshot, 'en'));
  });
});
