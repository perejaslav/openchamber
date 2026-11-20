
import { menuLabel, normalizeMenuLocale } from './menu-locales.mjs';

const isLinux = process.platform === 'linux';

const MAX_SESSIONS = 8;
const MAX_APPROVALS = 10;

const truncate = (value, max) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
};

const statusIconKey = (session) => {
  if (session.status === 'busy') return 'busy';
  if (session.status === 'retry') return 'retry';
  if (session.hasError) return 'error';
  if (session.unseen > 0) return 'unseen';
  return 'blank';
};

const sessionLabel = (session, t) => {
  return truncate(session.title || t('dock.untitledSession'), 40);
};

const approvalLabel = (approval, t) => {
  const icon = approval.kind === 'permission' ? '⛔' : '❓';
  const who = truncate(approval.sessionTitle || t('dock.untitledSession'), 24);
  const fallback = approval.kind === 'permission' ? t('tray.permissionRequest') : t('tray.question');
  const what = truncate(approval.label || fallback, 34);
  return `${icon} ${who} — ${what}`;
};

export const buildTrayMenuTemplate = (snapshot, { onAction, statusIcons, locale = 'en' }) => {
  const normalizedLocale = normalizeMenuLocale(locale);
  const t = (key) => menuLabel(normalizedLocale, key);
  const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
  const approvals = Array.isArray(snapshot.approvals) ? snapshot.approvals : [];
  const header = typeof snapshot.instanceName === 'string' && snapshot.instanceName.trim()
    ? snapshot.instanceName.trim()
    : 'OpenChamber';

  const template = [
    { label: header, enabled: false },
    { type: 'separator' },
  ];

  if (approvals.length > 0) {
    template.push({ label: t('tray.needsAttention'), enabled: false });
    const approvalItem = (approval) => {
      if (approval.kind === 'permission') {
        return {
          label: approvalLabel(approval, t),
          submenu: [
            { label: t('tray.allowOnce'), click: () => onAction({ type: 'respond-permission', sessionId: approval.sessionId, id: approval.id, response: 'once' }) },
            ...(approval.canSave ? [{ label: t('tray.allowAlways'), click: () => onAction({ type: 'respond-permission', sessionId: approval.sessionId, id: approval.id, response: 'always' }) }] : []),
            { type: 'separator' },
            { label: t('tray.deny'), click: () => onAction({ type: 'respond-permission', sessionId: approval.sessionId, id: approval.id, response: 'reject' }) },
            { type: 'separator' },
            { label: t('tray.openInApp'), click: () => onAction({ type: 'focus-session', sessionId: approval.sessionId, directory: approval.directory || '' }) },
          ],
        };
      }
      return {
        label: approvalLabel(approval, t),
        click: () => onAction({ type: 'focus-session', sessionId: approval.sessionId, directory: approval.directory || '' }),
      };
    };
    for (const approval of approvals.slice(0, MAX_APPROVALS)) {
      template.push(approvalItem(approval));
    }
    const approvalOverflow = approvals.slice(MAX_APPROVALS);
    if (approvalOverflow.length > 0) {
      template.push({
        label: t('tray.more').replace('{count}', String(approvalOverflow.length)),
        submenu: approvalOverflow.map(approvalItem),
      });
    }
    template.push({ type: 'separator' });
  }

  const sessionItem = (session) => ({
    label: sessionLabel(session, t),
    icon: statusIcons[statusIconKey(session)] || statusIcons.blank,
    ...(session.subtitle ? { sublabel: truncate(session.subtitle, 48) } : {}),
    click: () => onAction({ type: 'focus-session', sessionId: session.id, directory: session.directory || '' }),
  });

  if (sessions.length > 0) {
    template.push({ label: t('tray.sessions'), enabled: false });
    for (const session of sessions.slice(0, MAX_SESSIONS)) {
      template.push(sessionItem(session));
    }
    const overflow = sessions.slice(MAX_SESSIONS);
    if (overflow.length > 0) {
      template.push({
        label: t('tray.more').replace('{count}', String(overflow.length)),
        submenu: overflow.map(sessionItem),
      });
    }
  } else {
    template.push({ label: t('tray.noActiveSessions'), enabled: false });
  }

  const usage = snapshot.usage && typeof snapshot.usage === 'object' ? snapshot.usage : null;
  const usageGroups = usage && Array.isArray(usage.groups) ? usage.groups : [];
  if (usageGroups.length > 0) {
    const modeLabel = usage.mode === 'remaining' ? t('tray.remaining') : t('tray.used');
    const usageSubmenu = [];
    usageGroups.forEach((group, index) => {
      if (index > 0) usageSubmenu.push({ type: 'separator' });
      usageSubmenu.push({ label: group.provider, enabled: false });
      if (group.status) {
        usageSubmenu.push({ label: `    ${truncate(group.status, 40)}`, enabled: false });
      }
      for (const row of (Array.isArray(group.rows) ? group.rows : [])) {
        usageSubmenu.push({ label: `    ${row.label}  —  ${row.value}`, enabled: false });
      }
    });
    template.push(
      { type: 'separator' },
      { label: t('tray.usage').replace('{mode}', modeLabel), submenu: usageSubmenu },
    );
  }

  template.push(
    { type: 'separator' },
    { label: t('newSession'), click: () => onAction({ type: 'new-session' }) },
    { label: t('newMiniChat'), click: () => onAction({ type: 'new-mini-chat' }) },
  );

  if (isLinux || process.platform === 'win32') {
    template.push(
      { type: 'separator' },
      { label: t('tray.showWindow'), click: () => onAction({ type: 'show-main-window' }) },
      { label: t('tray.hideWindow'), click: () => onAction({ type: 'hide-main-window' }) },
      { type: 'separator' },
      { label: t('close'), click: () => onAction({ type: 'quit' }) },
    );
  } else {
    template.push(
      { label: t('tray.showApp'), click: () => onAction({ type: 'show-main-window' }) },
      { type: 'separator' },
      { label: t('tray.quitApp'), click: () => onAction({ type: 'quit' }) },
    );
  }

  return template;
};

export const trayMenuKey = (snapshot, locale = 'en') => {
  const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
  const approvals = Array.isArray(snapshot.approvals) ? snapshot.approvals : [];
  const usage = snapshot.usage && typeof snapshot.usage === 'object' ? snapshot.usage : {};
  const groups = Array.isArray(usage.groups) ? usage.groups : [];
  return JSON.stringify({
    l: normalizeMenuLocale(locale),
    h: typeof snapshot.instanceName === 'string' ? snapshot.instanceName : '',
    s: sessions.map((s) => `${s.id}|${s.title}|${s.status}|${s.unseen}|${s.hasError}|${s.subtitle}|${s.directory}`),
    a: approvals.map((a) => `${a.id}|${a.kind}|${a.sessionId}|${a.sessionTitle}|${a.label}|${a.directory}|${a.canSave ? 1 : 0}`),
    u: usage.mode || '',
    g: groups.map((g) => `${g.provider}|${g.status}|${(Array.isArray(g.rows) ? g.rows : []).map((r) => `${r.label}|${r.value}`).join(',')}`),
  });
};
