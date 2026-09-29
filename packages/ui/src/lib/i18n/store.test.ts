import { beforeEach, describe, expect, test } from 'bun:test';
import { DEFAULT_LOCALE, detectInitialLocale, type Locale } from './runtime';
import { resetI18nDictionaryCacheForTests, useI18nStore } from './store';

const defaultDictionary = useI18nStore.getState().dictionary;

const resetStore = () => {
  resetI18nDictionaryCacheForTests();
  useI18nStore.setState({
    locale: DEFAULT_LOCALE,
    dictionary: defaultDictionary,
    loadingLocale: null,
  });
};

const waitForLocaleLoadToSettle = async (locale: Locale) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (useI18nStore.getState().loadingLocale !== locale) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Timed out waiting for ${locale} dictionary load`);
};

describe('i18n store', () => {
  beforeEach(resetStore);

  test('a fresh install starts in Russian and the Russian dictionary really loads', async () => {
    expect(DEFAULT_LOCALE).toBe('ru');
    expect(detectInitialLocale()).toBe('ru');

    try {
      useI18nStore.getState().setLocale('ru');

      // Guards the dictionary-cache seeding: if the cache maps the default
      // locale to the English dictionary, `setLocale('ru')` short-circuits and
      // this stays null while the UI keeps rendering English.
      expect(useI18nStore.getState().loadingLocale).toBe('ru');
      await waitForLocaleLoadToSettle('ru');
      expect(useI18nStore.getState().dictionary['common.language.russian']).toBe('Русский');
    } finally {
      resetStore();
    }
  });

  test('retries loading the active locale when it is not cached', async () => {
    useI18nStore.setState({
      locale: 'es',
      dictionary: defaultDictionary,
      loadingLocale: null,
    });

    try {
      useI18nStore.getState().setLocale('es');

      expect(useI18nStore.getState().loadingLocale).toBe('es');
      await waitForLocaleLoadToSettle('es');
    } finally {
      resetStore();
    }
  });

  test('loads the french dictionary', async () => {
    try {
      useI18nStore.getState().setLocale('fr');

      expect(useI18nStore.getState().loadingLocale).toBe('fr');
      await waitForLocaleLoadToSettle('fr');
      expect(useI18nStore.getState().dictionary['common.language.french']).toBe('Français');
    } finally {
      resetStore();
    }
  });
});
