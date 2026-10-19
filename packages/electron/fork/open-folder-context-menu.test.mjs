import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EXPLORER_SHELL_KEY,
  OPEN_FOLDER_ARG,
  OPEN_FOLDER_LABEL,
  buildExplorerCommand,
  createOpenFolderContextMenu,
  readOpenFolderTargets,
} from './open-folder-context-menu.mjs';

test('reads the folder a launch asked for', () => {
  assert.deepEqual(
    readOpenFolderTargets(['C:\\Program Files\\OpenChamber\\OpenChamber.exe', '--open-folder=D:\\github\\UTR']),
    ['D:\\github\\UTR'],
  );
});

test('keeps a path with spaces whole', () => {
  assert.deepEqual(
    readOpenFolderTargets([OPEN_FOLDER_ARG + '=C:\\My Projects\\a b']),
    ['C:\\My Projects\\a b'],
  );
});

test('reads several folders and ignores an empty value', () => {
  assert.deepEqual(
    readOpenFolderTargets([`${OPEN_FOLDER_ARG}=D:\\a`, '--other', 'x', `${OPEN_FOLDER_ARG}=D:\\b`]),
    ['D:\\a', 'D:\\b'],
  );
  assert.deepEqual(readOpenFolderTargets([`${OPEN_FOLDER_ARG}=`]), []);
  assert.deepEqual(readOpenFolderTargets([`${OPEN_FOLDER_ARG}=   `]), []);
  assert.deepEqual(readOpenFolderTargets(undefined), []);
});

test('survives the command line Electron rebuilds: switches first, paths last', () => {
  // Chromium re-renders the line as every switch, then the positional
  // arguments. A bare `--open-folder "D:\proj"` therefore arrives with another
  // switch right behind the flag and the path moved to the end — which is why
  // Explorer is configured with the value inside the switch.
  const reordered = [
    'OpenChamber.exe',
    '--allow-file-access-from-files',
    '--user-data-dir=C:\\Users\\person\\AppData\\Roaming\\OpenChamber',
    '--open-folder=D:\\proj',
    'D:\\proj',
  ];
  assert.deepEqual(readOpenFolderTargets(reordered), ['D:\\proj']);
});

test('a bare flag followed by another switch is not read as a path', () => {
  assert.deepEqual(
    readOpenFolderTargets(['OpenChamber.exe', OPEN_FOLDER_ARG, '--allow-file-access-from-files', 'D:\\proj']),
    [],
  );
});

test('the bare form still works when the path stayed next to the flag', () => {
  assert.deepEqual(readOpenFolderTargets([OPEN_FOLDER_ARG, 'D:\\proj']), ['D:\\proj']);
});

test('builds the Explorer command with the clicked folder inside the switch', () => {
  const command = buildExplorerCommand('C:\\Apps\\OpenChamber\\OpenChamber.exe');
  assert.equal(command, '"C:\\Apps\\OpenChamber\\OpenChamber.exe" --open-folder="%1"');
});

test('reads a value that still carries quotes', () => {
  assert.deepEqual(readOpenFolderTargets(['"--open-folder=C:\\a b"']), ['C:\\a b']);
  assert.deepEqual(readOpenFolderTargets(['--open-folder="C:\\a b"']), ['C:\\a b']);
  // A path ending in a backslash can swallow the closing quote.
  assert.deepEqual(readOpenFolderTargets(['--open-folder=D:\\']), ['D:\\']);
});

test('the entry is registered per user, under the folder verb', () => {
  assert.equal(EXPLORER_SHELL_KEY, 'OpenChamber.OpenInOpenChamber');
  assert.equal(OPEN_FOLDER_LABEL, 'Open in OpenChamber');
});

const waitUntil = async (predicate, timeoutMs = 8_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return predicate();
};

/** Runs the module with a fake server and a fake window, returning what it did. */
const runLaunch = async ({
  argv,
  launch,
  settings,
  projectPath = 'D:\\proj',
  expectEvents = 1,
  idleMs = 400,
}) => {
  const events = [];
  const requests = [];
  const warnings = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({
      url: String(url),
      body: JSON.parse(init.body),
      method: init.method,
      hasAuth: Boolean(init.headers.Authorization),
    });
    return new Response(JSON.stringify({ success: true, path: projectPath, settings }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const menu = createOpenFolderContextMenu({
      app: { isPackaged: true, getPath: () => 'C:\\Apps\\OpenChamber\\OpenChamber.exe' },
      log: { info: () => {}, warn: (message, detail) => warnings.push({ message, detail }) },
      getMainWindow: () => ({ isDestroyed: () => false, webContents: { isLoading: () => false } }),
      getSidecarUrl: () => 'http://127.0.0.1:57123',
      getClientToken: () => 'token',
      emit: (event, detail) => events.push({ event, detail }),
    });
    menu[launch ? 'handleLaunch' : 'handleArgv'](argv);
    if (expectEvents === 0) {
      await new Promise((resolve) => setTimeout(resolve, idleMs));
    } else {
      await waitUntil(() => events.length >= expectEvents, 12_000);
      // Let a repeat snapshot arrive too, so the tests can see all of it.
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { events, requests, warnings };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('a second instance registers the folder, then wakes the renderer', async () => {
  const settings = {
    projects: [{ id: 'path_RDpcHA', path: 'D:\\proj' }],
    activeProjectId: 'path_RDpcHA',
  };
  const { events, requests } = await runLaunch({
    argv: ['OpenChamber.exe', '--open-folder=D:\\proj'],
    launch: false,
    settings,
    expectEvents: 2,
  });

  assert.deepEqual(requests, [
    {
      url: 'http://127.0.0.1:57123/api/openchamber/directory',
      method: 'POST',
      body: { path: 'D:\\proj' },
      hasAuth: true,
    },
  ]);
  // The snapshot must land first: it is what puts the project in the list.
  assert.deepEqual(events, [
    { event: 'openchamber:settings-synced', detail: { settings, bootstrap: true } },
    { event: 'openchamber:open-draft-session', detail: { directory: 'D:\\proj', projectId: 'path_RDpcHA' } },
  ]);
});

test('a launch that boots the app repeats the snapshot after the renderer has read its own', async () => {
  const settings = {
    projects: [{ id: 'path_RDpcHA', path: 'D:\\proj' }],
    activeProjectId: 'path_RDpcHA',
  };
  const { events } = await runLaunch({
    argv: ['OpenChamber.exe', '--open-folder=D:\\proj'],
    launch: true,
    settings,
    expectEvents: 3,
  });

  assert.deepEqual(
    events.map((entry) => entry.event),
    ['openchamber:settings-synced', 'openchamber:settings-synced', 'openchamber:open-draft-session'],
  );
  // The chat opens last, once the folder is the active project for sure.
  assert.equal(events.at(-1).detail.directory, 'D:\\proj');
});

test('a launch with no folder argument does nothing at all', async () => {
  const { events, requests } = await runLaunch({
    argv: ['OpenChamber.exe', '--allow-file-access-from-files', 'C:\\Users\\person'],
    launch: false,
    settings: { projects: [], activeProjectId: null },
    expectEvents: 0,
    idleMs: 500,
  });
  assert.deepEqual(requests, []);
  assert.deepEqual(events, []);
});
