#!/usr/bin/env node
/**
 * Правки форка, которые нужно наложить заново после мержа с апстримом.
 *
 * Логика фич лежит в форковых файлах, которые апстрим не трогает, поэтому
 * конфликт возможен только в точках врезки — как правило, в файлах апстрима.
 * Здесь описаны эти врезки: якорь (строка апстрима) и её замена (строка форка).
 *
 * Якорь — это содержимое строки, а не её место: апстрим может переставить
 * импорты, и замена всё равно сработает. Если якоря нет — разметка изменилась,
 * и вызывающий код останавливает синк и открывает issue, вместо того чтобы
 * молча потерять фичу.
 */
import fs from 'node:fs';

/**
 * «Открыть в OpenChamber» в контекстном меню Проводника.
 *
 * Вся логика — в форковом файле `packages/electron/fork/open-folder-context-menu.mjs`,
 * который апстрим не трогает. В `packages/electron/main.mjs` форк меняет три
 * места: импорт, установку меню и подхват аргументов второго экземпляра.
 */
export const OPEN_FOLDER_HOOK_FILE = 'packages/electron/main.mjs';

export const OPEN_FOLDER_HOOK_RULES = [
  {
    from: "import { createLoadFailureWarningFilter } from './load-failure-warnings.mjs';",
    to: [
      "import { createLoadFailureWarningFilter } from './load-failure-warnings.mjs';",
      '// RU fork: "Open in OpenChamber" in the Windows Explorer context menu. The',
      '// feature lives in a fork-owned file; this import and the three calls below',
      '// are the only places upstream code is touched.',
      "import { createOpenFolderContextMenu } from './fork/open-folder-context-menu.mjs';",
    ].join('\n'),
  },
  {
    from: 'const setTaskbarProgress = (value) => {',
    to: [
      '// RU fork: "Open in OpenChamber" in the Windows Explorer context menu. The app',
      '// registers the entry itself, so every fork build ships it and an app update',
      '// never drops it. The folder of this launch (or of a second instance) is',
      '// picked up from the arguments.',
      'const openFolderContextMenu = createOpenFolderContextMenu({',
      '  app,',
      '  log,',
      '  getMainWindow: () => state.mainWindow,',
      '  getSidecarUrl: () => state.sidecarUrl,',
      '  getClientToken: () => readDesktopLocalClientToken(),',
      '  emit: emitToPrimaryWindow,',
      '});',
      'openFolderContextMenu.register();',
      'openFolderContextMenu.handleArgv(process.argv);',
      '',
      'const setTaskbarProgress = (value) => {',
    ].join('\n'),
  },
  {
    from: [
      '  if (urls.length > 0) handleDeepLinks(urls);',
      '  if (BrowserWindow.getAllWindows().length > 0) {',
    ].join('\n'),
    to: [
      '  if (urls.length > 0) handleDeepLinks(urls);',
      '  // RU fork: a folder picked in the Explorer context menu arrives as an',
      '  // argument, not as a deep link.',
      '  openFolderContextMenu.handleArgv(argv);',
      '  if (BrowserWindow.getAllWindows().length > 0) {',
    ].join('\n'),
  },
];

/**
 * Наложить врезки форка на версию файла от апстрима.
 *
 * Бросает исключение, если якорь не найден: разметка апстрима изменилась, и
 * дальше решать должен человек, а не скрипт.
 */
export const ensureOpenFolderHooks = (file) => {
  let source = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const rule of OPEN_FOLDER_HOOK_RULES) {
    if (source.includes(rule.to)) continue;
    if (!source.includes(rule.from)) {
      throw new Error(`${file}: якорь правки форка не найден — файл изменился, нужна ручная правка`);
    }
    source = source.replace(rule.from, rule.to);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, source, 'utf8');
  return changed;
};
