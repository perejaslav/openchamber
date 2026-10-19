import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EXPLORER_SHELL_KEY,
  OPEN_FOLDER_ARG,
  OPEN_FOLDER_LABEL,
  buildExplorerCommand,
  readOpenFolderTargets,
} from './open-folder-context-menu.mjs';

test('reads the folder a launch asked for', () => {
  assert.deepEqual(
    readOpenFolderTargets(['C:\\Program Files\\OpenChamber\\OpenChamber.exe', OPEN_FOLDER_ARG, 'D:\\github\\UTR']),
    ['D:\\github\\UTR'],
  );
});

test('reads several folders and ignores a missing value', () => {
  assert.deepEqual(
    readOpenFolderTargets([OPEN_FOLDER_ARG, 'D:\\a', '--other', 'x', OPEN_FOLDER_ARG, 'D:\\b']),
    ['D:\\a', 'D:\\b'],
  );
  assert.deepEqual(readOpenFolderTargets([OPEN_FOLDER_ARG]), []);
  assert.deepEqual(readOpenFolderTargets([OPEN_FOLDER_ARG, '   ']), []);
  assert.deepEqual(readOpenFolderTargets(undefined), []);
});

test('keeps a path that looks like a flag', () => {
  assert.deepEqual(readOpenFolderTargets([OPEN_FOLDER_ARG, '--not-a-flag']), ['--not-a-flag']);
});

test('builds the Explorer command with the clicked folder as an argument', () => {
  const command = buildExplorerCommand('C:\\Apps\\OpenChamber\\OpenChamber.exe');
  assert.equal(command, '"C:\\Apps\\OpenChamber\\OpenChamber.exe" --open-folder "%1"');
});

test('the entry is registered per user, under the folder verb', () => {
  assert.equal(EXPLORER_SHELL_KEY, 'OpenChamber.OpenInOpenChamber');
  assert.equal(OPEN_FOLDER_LABEL, 'Open in OpenChamber');
});
