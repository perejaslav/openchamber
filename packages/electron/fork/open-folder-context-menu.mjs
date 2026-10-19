/**
 * RU fork: "Open in OpenChamber" in the Windows Explorer context menu.
 *
 * The app registers the entry itself, the way it registers the `openchamber://`
 * protocol handler, so every fork build ships it and an app update never drops
 * it.
 *
 * The folder travels as `--open-folder=<path>` — one argument, value inside the
 * switch. Electron does not hand the command line through as Explorer wrote it:
 * Chromium rebuilds it as "switches first, positional arguments last", so a
 * bare `--open-folder "<path>"` reaches the main process with the path moved to
 * the end of the line and another switch right behind the flag. Keeping the
 * value inside the switch survives that reordering, and Explorer substitutes
 * `%1` verbatim, so a path with `&`, `#`, `?` or `%` in it is safe too.
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
// A launch that starts the app races its own boot: the renderer reads the
// settings snapshot while this module registers the folder. Settling a moment
// before speaking to the renderer, then repeating the (idempotent) snapshot
// after it, makes the folder win either way.
const COLD_START_SETTLE_MS = 900;
const COLD_START_REPEAT_MS = 2_000;

/**
 * Drop the quotes a command line may still carry on an argument, so a value
 * that arrives as `"--open-folder=C:\a b"` reads the same as one that arrives
 * already unquoted.
 */
const stripSurroundingQuotes = (value) => {
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
};

/**
 * The folders a launch asked for.
 *
 * `--open-folder=<path>` is the form Explorer is configured with: one argument
 * whose value is the path. The bare `--open-folder <path>` form is still read
 * for the case where the two arguments stayed neighbours, but only when the
 * next argument is clearly not a switch.
 */
export const readOpenFolderTargets = (argv) => {
  const args = Array.isArray(argv) ? argv : [];
  const targets = [];
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (typeof raw !== 'string') continue;
    const arg = stripSurroundingQuotes(raw);
    if (!arg.startsWith(OPEN_FOLDER_ARG)) continue;
    if (arg.length > OPEN_FOLDER_ARG.length && arg[OPEN_FOLDER_ARG.length] === '=') {
      // A path that ends in a backslash can swallow a closing quote in the
      // command-line rules; a leftover trailing quote is not part of a path.
      const value = arg.slice(OPEN_FOLDER_ARG.length + 1).trim().replace(/^"/, '').replace(/"$/, '');
      if (value.length > 0) targets.push(value);
      continue;
    }
    if (arg !== OPEN_FOLDER_ARG) continue;
    const next = args[index + 1];
    if (typeof next === 'string' && next.trim().length > 0 && !next.startsWith('-')) {
      targets.push(next.trim());
      index += 1;
    }
  }
  return targets;
};

/** The command Explorer runs: the app with the clicked folder inside a switch. */
export const buildExplorerCommand = (exePath) =>
  `"${exePath}" ${OPEN_FOLDER_ARG}="%1"`;

const runReg = (args) => new Promise((resolve) => {
  execFile('reg.exe', args, { windowsHide: true }, (error) => resolve(!error));
});

/**
 * Write the context-menu entry under HKCU. Four values, all idempotent: the app
 * rewrites them on every launch, so a moved install path or a changed label
 * heals itself.
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
      log?.warn?.('[electron] open-folder: failed to write the Explorer entry', { key: args[1] });
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
 * Register the folder on the local server and read the fresh settings back.
 * The server makes it the active project as it does for the "add project"
 * dialog — the renderer only has to be told to look.
 */
export const requestDirectory = async ({ folder, baseUrl, clientToken, log } = {}) => {
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
    const detail = await response.text().catch(() => '');
    throw new Error(`directory request failed with ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  const payload = await response.json().catch(() => null);
  const settings = payload?.settings;
  if (!settings || typeof settings !== 'object') {
    throw new Error('directory response carried no settings');
  }
  const directory = typeof payload?.path === 'string' && payload.path.length > 0 ? payload.path : folder;
  const project = findProjectByPath(settings.projects, directory);
  log?.info?.('[electron] open-folder: folder registered', { directory, projectId: project?.id ?? '' });
  return { settings, directory, projectId: project?.id ?? '' };
};

/**
 * The renderer's project list comes from the server, and it only re-reads it
 * when something says so. `openchamber:settings-synced` is that signal: the
 * renderer adopts the snapshot and switches to the active project.
 */
export const adoptSettingsSnapshot = ({ emit, settings, directory, projectId }) => {
  emit?.('openchamber:settings-synced', { settings, bootstrap: true });
  return { directory, projectId };
};

/** A new chat in the folder. Must come after the snapshot, or it lands nowhere. */
export const openDraftInFolder = ({ emit, directory, projectId }) => {
  emit?.('openchamber:open-draft-session', { directory, projectId });
};

/** Register the folder and open a chat in it in one go. */
export const openFolderInOpenChamber = async ({ folder, baseUrl, clientToken, emit, log } = {}) => {
  const opened = await requestDirectory({ folder, baseUrl, clientToken, log });
  adoptSettingsSnapshot({ emit, ...opened });
  openDraftInFolder({ emit, ...opened });
  log?.info?.('[electron] open-folder: chat opened', { directory: opened.directory, projectId: opened.projectId });
  return { ok: true, ...opened };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(READY_POLL_MS);
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

  const sidecarUrl = () => {
    const value = getSidecarUrl?.();
    return typeof value === 'string' ? value : '';
  };

  const isWindowReady = () => {
    const window = getMainWindow?.();
    if (!window || window.isDestroyed?.()) return false;
    return window.webContents?.isLoading?.() !== true;
  };

  const openFolder = async (folder, { settle }) => {
    // The server comes up before the window does, so registering the folder
    // early lets the renderer's own boot snapshot already carry it.
    const serverUp = await waitFor(() => sidecarUrl().length > 0, READY_TIMEOUT_MS);
    if (!serverUp) {
      log?.warn?.('[electron] open-folder: the local server never came up', { folder });
      return;
    }
    let opened;
    try {
      opened = await requestDirectory({
        folder,
        baseUrl: sidecarUrl(),
        clientToken: getClientToken?.() ?? '',
        log,
      });
    } catch (error) {
      log?.warn?.('[electron] open-folder: failed', { folder, error: error?.message ?? String(error) });
      return;
    }

    const windowReady = await waitFor(isWindowReady, READY_TIMEOUT_MS);
    if (!windowReady) {
      log?.warn?.('[electron] open-folder: the window never became ready', { folder });
      return;
    }
    if (settle) await sleep(COLD_START_SETTLE_MS);
    adoptSettingsSnapshot({ emit, ...opened });
    if (settle) {
      // The renderer may have read its settings before the folder existed;
      // repeating the snapshot after that read has landed settles the argument.
      await sleep(COLD_START_REPEAT_MS);
      adoptSettingsSnapshot({ emit, ...opened });
    }
    openDraftInFolder({ emit, ...opened });
    log?.info?.('[electron] open-folder: chat opened', {
      directory: opened.directory,
      projectId: opened.projectId,
      settle,
    });
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      while (pending.length > 0) {
        const entry = pending[0];
        await openFolder(entry.folder, { settle: entry.settle });
        pending.shift();
      }
    } finally {
      draining = false;
    }
  };

  const schedule = (folder, settle) => {
    if (typeof folder !== 'string' || folder.trim().length === 0) return;
    pending.push({ folder: folder.trim(), settle });
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

    /** The folders this very launch asked for — the app is still booting. */
    handleLaunch: (argv) => {
      for (const folder of readOpenFolderTargets(argv)) {
        schedule(folder, true);
      }
    },

    /** The folders another instance handed over; the app is already up. */
    handleArgv: (argv) => {
      for (const folder of readOpenFolderTargets(argv)) {
        schedule(folder, false);
      }
    },
  };
};
