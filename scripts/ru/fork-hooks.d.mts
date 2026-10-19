/**
 * Типы для скрипта форка, который накладывает правки на файлы апстрима.
 * Сам скрипт — обычный node-модуль без типов; здесь только то, чем
 * пользуется тест форка.
 */
export declare const OPEN_FOLDER_HOOK_FILE: string;

export interface ForkHookRule {
  /** Строка апстрима, рядом с которой живёт правка форка. */
  from: string;
  /** Строка форка, которая заменяет `from`. */
  to: string;
}

export declare const OPEN_FOLDER_HOOK_RULES: ForkHookRule[];

/**
 * Наложить врезки форка на версию файла от апстрима.
 * Бросает исключение, если якорь не найден.
 */
export declare function ensureOpenFolderHooks(file: string): boolean;
