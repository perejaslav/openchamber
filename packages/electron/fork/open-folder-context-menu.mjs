/**
 * RU fork: "Open in OpenChamber" in the Windows Explorer context menu.
 *
 * The app registers the entry itself, the way it registers the `openchamber://`
 * protocol handler, so every fork build ships it and an app update never drops
 * it. The registry command carries the folder as a plain argument instead of
 * inside a URL: Explorer substitutes `%1` verbatim, and a path with `&`, `#`,
 * `?` or `%` in it would not survive being pasted into a query string.
 *
 * Opening a folder is the renderer's job, not the main process's: the project
 * list lives in the renderer's store, and only the renderer can add a project.
 * So the main process does the half it can do — register the folder on the
 * local server and read the fresh settings back — and hands the renderer the
 * two events it already understands:
 *
 *   - `openchamber:settings-synced` — the renderer adopts the server's project
 *     list and the active project (useProjectsStore.synchronizeFromSettings).
 *   - `openchamber:open-draft-session` — a new chat in that folder.
 *
 * Nothing in `packages/ui` changes, and the whole feature lives in this
 * fork-owned file: an upstream merge has nothing to conflict with here.
 */
import { execFile } from 'node:child_process';

export const OPEN_FOLDER_ARG = '--open-folder';
export const OPEN_FOLDER_LABEL = 'Open in OpenChamber';
export const EXPLORER_SHELL_KEY = 'OpenChamber.OpenInOpenChamber';

const REGISTRY_CLASSES_ROOT = 'HKCU\\Software\\Classes\\Directory\\shell';
const DIRECTORY_REQUEST_TIMEOUT_MS = 15_000;
const READY_TIMEOUT_MS = 90_000;
const READY_POLL_MS = 250;

/**
 * The folders a launch asked for. The flag is its own argument, so a path
 * that starts with a dash is still a path.
 */
export const readOpenFolderTargets = (argv) => {
  const args = Array.isArray(argv) ? argv : [];
  const targets = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== OPEN_FOLDER_ARG) continue;
    const next = args[index + 1];
    if (typeof next === 'string' && next.trim().length > 0) {
      targets.push(next.trim());
    }
  }
  return targets;
};

/** The command Explorer runs: the app with the clicked folder as an argument. */
export const buildExplorerCommand = (exePath) =>
  `"${exePath}" ${OPEN_FOLDER_ARG} "%1"`;

const runReg = (args) => new Promise((resolve) => {
  execFile('reg.exe', args, { windowsHide: true }, (error) => resolve(!error));
});

/**
 * Write the context-menu entry under HKCU. Three values, all idempotent: the
 * app rewrites them on every launch, so a moved install path or a changed
 * label heals itself.
 */
export const registerExplorerContextMenu = async ({ exePath, log } = {}) => {
  if (process.platform !== 'win32') {
    return { ok: false, reason: 'not-windows' };
  }
  if (typeof exePath !== 'string' || exePath.trim().length === 0) {
    return { ok: false, reason: 'no-exe-path' };
  }
  const key = `${REGISTRY_CLASSES_ROOT}\\${EXPLORER_SHELL_KEY}`;
  const command = buildExplorerCommand(exePath);
  const writes = [
    ['add', key, '/ve', '/t', 'REG_SZ', '/d', OPEN_FOLDER_LABEL, '/f'],
    ['add', key, '/v', 'MUIVerb', '/t', 'REG_SZ', '/d', OPEN_FOLDER_LABEL, '/f'],
    ['add', key, '/v', 'Icon', '/t', 'REG_SZ', '/d', exePath, '/f'],
    ['add', `${key}\\command`, '/ve', '/t', 'REG_SZ', '/d', command, '/f'],
  ];
  for (const args of writes) {
    const ok = await runReg(args);
    if (!ok) {
      log?.warn?.('[electron] open-folder: failed to write the Explorer entry', { args: args[1] });
      return { ok: false, reason: 'reg-failed' };
    }
  }
  log?.info?.('[electron] open-folder: Explorer entry registered', { key });
  return { ok: true };
};

/** The project the server now knows for this folder, if it named one back. */
const findProjectByPath = (projects, path) => {
  if (!Array.isArray(projects)) return null;
  return projects.find((entry) => entry?.path === path) ?? null;
};

/**
 * Register the folder on the local server and tell the renderer to adopt the
 * fresh project list and open a chat there.
 */
export const openFolderInOpenChamber = async ({ folder, baseUrl, clientToken, emit, log } = {}) => {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (typeof clientToken === 'string' && clientToken.trim().length > 0) {
    headers.Authorization = `Bearer ${clientToken.trim()}`;
  }
  const response = await fetch(new URL('/api/openchamber/directory', `${baseUrl}/`).toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: folder }),
    signal: AbortSignal.timeout(DIRECTORY_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`directory request failed with ${response.status}`);
  }
  const payload = await response.json().catch(() => null);
  const settings = payload?.settings;
  if (!settings || typeof settings !== 'object') {
    throw new Error('directory response carried no settings');
  }
  const resolvedPath = typeof payload?.path === 'string' && payload.path.length > 0 ? payload.path : folder;
  const project = findProjectByPath(settings.projects, resolvedPath);

  // The renderer's project list comes from the server, and it only re-reads it
  // when something says so. `openchamber:settings-synced` is that signal: the
  // renderer adopts the snapshot and switches to the active project.
  emit?.('openchamber:settings-synced', { settings, bootstrap: true });
  emit?.('openchamber:open-draft-session', { directory: resolvedPath, projectId: project?.id ?? '' });
  log?.info?.('[electron] open-folder: folder opened', { folder: resolvedPath, projectId: project?.id ?? '' });
  return { ok: true, projectId: project?.id ?? '', directory: resolvedPath };
};

const waitFor = async (predicate, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  return predicate();
};

/**
 * The Explorer entry, and the machinery behind it.
 *
 * `deps` comes from the main process: `getMainWindow` and `getSidecarUrl` tell
 * us when the app is ready to be driven, `emit` reaches the renderer, `log`
 * records what happened.
 */
export const createOpenFolderContextMenu = (deps = {}) => {
  const {
    getMainWindow,
    getSidecarUrl,
    getClientToken,
    emit,
    log,
    app,
  } = deps;

  const pending = [];
  let draining = false;

  const isReady = () => {
    const window = getMainWindow?.();
    if (!window || window.isDestroyed?.()) return false;
    if (window.webContents?.isLoading?.()) return false;
    return typeof getSidecarUrl?.() === 'string' && getSidecarUrl().length > 0;
  };

  const openFolder = async (folder) => {
    const ready = await waitFor(isReady, READY_TIMEOUT_MS);
    if (!ready) {
      log?.warn?.('[electron] open-folder: the app did not become ready in time', { folder });
      return;
    }
    try {
      await openFolderInOpenChamber({
        folder,
        baseUrl: getSidecarUrl(),
        clientToken: getClientToken?.() ?? '',
        emit,
        log,
      });
    } catch (error) {
      log?.warn?.('[electron] open-folder: failed', { folder, error: error?.message ?? String(error) });
    }
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      while (pending.length > 0) {
        const folder = pending[0];
        await openFolder(folder);
        pending.shift();
      }
    } finally {
      draining = false;
    }
  };

  const schedule = (folder) => {
    if (typeof folder !== 'string' || folder.trim().length === 0) return;
    pending.push(folder.trim());
    void drain();
  };

  return {
    /** Write the Explorer entry. Windows only; a no-op elsewhere. */
    register: () => {
      if (process.platform !== 'win32') return;
      const exePath = app?.getPath?.('exe');
      if (typeof exePath !== 'string' || exePath.length === 0) return;
      // A development run has no install directory to point Explorer at.
      if (app?.isPackaged === false) return;
      void registerExplorerContextMenu({ exePath, log });
    },

    /** Pick up the folders a launch asked for. */
    handleArgv: (argv) => {
      for (const folder of readOpenFolderTargets(argv)) {
        schedule(folder);
      }
    },
  };
};
