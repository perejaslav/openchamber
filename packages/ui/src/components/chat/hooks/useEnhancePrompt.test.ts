import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

import { useEnhancePrompt, type EnhancePromptRunner, type UseEnhancePrompt } from './useEnhancePrompt';

const withDom = async (run: () => Promise<void>) => {
  const dom = new Window({ url: 'http://localhost/' });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom, document: dom.document, navigator: dom.navigator,
    Element: dom.Element, HTMLElement: dom.HTMLElement, Node: dom.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globals)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  try {
    await run();
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    await dom.happyDOM.close();
  }
};

type DraftStore = { text: string };

const mountHook = async (store: DraftStore, runEnhance: EnhancePromptRunner, onError?: (error: Error) => void) => {
  const root = createRoot(document.createElement('div'));
  let api: UseEnhancePrompt | null = null;
  const Harness = () => {
    api = useEnhancePrompt({
      runEnhance,
      getDraft: () => store.text,
      setDraft: (text) => { store.text = text; },
      onError,
    });
    return null;
  };
  await act(async () => { root.render(React.createElement(Harness)); });
  const get = (): UseEnhancePrompt => {
    if (!api) throw new Error('hook not mounted');
    return api;
  };
  return {
    get,
    request: () => act(async () => get().requestEnhance()),
    cleanup: async () => act(async () => { root.unmount(); }),
  };
};

describe('useEnhancePrompt', () => {
  test('applies the result and rolls back byte-for-byte', () => withDom(async () => {
    const store = { text: '  fix login  ' };
    const h = await mountHook(store, async ({ draft }) => `FIXED: ${draft}`);
    expect(await h.request()).toBe(true);
    expect(store.text).toBe('FIXED:   fix login  ');
    expect(h.get().canRollback).toBe(true);
    await act(async () => { expect(h.get().rollbackEnhance()).toBe(true); });
    expect(store.text).toBe('  fix login  ');
    expect(h.get().canRollback).toBe(false);
    await h.cleanup();
  }));

  test('empty draft is a no-op', () => withDom(async () => {
    const store = { text: '   ' };
    let calls = 0;
    const h = await mountHook(store, async () => { calls += 1; return 'x'; });
    expect(await h.request()).toBe(false);
    expect(calls).toBe(0);
    expect(store.text).toBe('   ');
    await h.cleanup();
  }));

  test('overlapping requests are rejected', () => withDom(async () => {
    const store = { text: 'draft' };
    let release!: (value: string) => void;
    const gate = new Promise<string>((resolve) => { release = resolve; });
    const h = await mountHook(store, () => gate);
    await act(async () => {
      const first = h.get().requestEnhance();
      expect(await h.get().requestEnhance()).toBe(false);
      release('enhanced');
      expect(await first).toBe(true);
    });
    expect(store.text).toBe('enhanced');
    await h.cleanup();
  }));

  test('typing during the request discards the result', () => withDom(async () => {
    const store = { text: 'original' };
    let release!: (value: string) => void;
    const gate = new Promise<string>((resolve) => { release = resolve; });
    const h = await mountHook(store, () => gate);
    await act(async () => {
      const pending = h.get().requestEnhance();
      store.text = 'user kept typing';
      release('stale enhance');
      expect(await pending).toBe(false);
    });
    expect(store.text).toBe('user kept typing');
    expect(h.get().canRollback).toBe(false);
    await h.cleanup();
  }));

  test('cancel keeps the draft and Escape consumes in order', () => withDom(async () => {
    const store = { text: 'draft' };
    let release!: (value: string) => void;
    const gate = new Promise<string>((resolve) => { release = resolve; });
    const h = await mountHook(store, () => gate);
    await act(async () => {
      const pending = h.get().requestEnhance();
      expect(h.get().handleEscape()).toBe(true);
      release('late');
      expect(await pending).toBe(false);
    });
    expect(store.text).toBe('draft');
    // Idle Escape is not consumed.
    await act(async () => { expect(h.get().handleEscape()).toBe(false); });
    await h.cleanup();
  }));

  test('manual edit after the result drops the rollback', () => withDom(async () => {
    const store = { text: 'draft' };
    const h = await mountHook(store, async ({ draft }) => `ENHANCED ${draft}`);
    expect(await h.request()).toBe(true);
    await act(async () => { h.get().markEdited(); });
    await act(async () => { expect(h.get().rollbackEnhance()).toBe(false); });
    expect(store.text).toBe('ENHANCED draft');
    await h.cleanup();
  }));

  test('re-run regenerates from the original, not the enhanced text', () => withDom(async () => {
    const store = { text: 'draft' };
    const seen: string[] = [];
    const h = await mountHook(store, async ({ draft }) => { seen.push(draft); return `ENHANCED ${draft}`; });
    expect(await h.request()).toBe(true);
    expect(await h.request()).toBe(true);
    expect(seen).toEqual(['draft', 'draft']);
    expect(store.text).toBe('ENHANCED draft');
    await act(async () => { expect(h.get().rollbackEnhance()).toBe(true); });
    expect(store.text).toBe('draft');
    await h.cleanup();
  }));

  test('runner failure reports and keeps the draft', () => withDom(async () => {
    const store = { text: 'draft' };
    const errors: Error[] = [];
    const h = await mountHook(store, async () => { throw new Error('model down'); }, (error) => { errors.push(error); });
    expect(await h.request()).toBe(false);
    expect(store.text).toBe('draft');
    expect(errors).toHaveLength(1);
    await h.cleanup();
  }));
});
