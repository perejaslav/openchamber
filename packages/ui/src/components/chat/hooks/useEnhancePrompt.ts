import React from 'react';

/** Input passed to the enhance runner. The runner implementation (LLM call)
 *  is injected by the owner; the hook only owns the draft/rollback state
 *  machine so the UX stays testable without a model. */
export type EnhancePromptRunnerInput = {
  /** The draft to enhance. On re-run this is the pre-enhance original,
   *  never the previously enhanced text. */
  draft: string;
  /** Monotonic id of the request, for logging/debugging. */
  requestId: number;
};

export type EnhancePromptRunner = (input: EnhancePromptRunnerInput) => Promise<string>;

type UseEnhancePromptOptions = {
  /** Async enhance implementation (stubbed in the UX step, LLM-backed later). */
  runEnhance: EnhancePromptRunner;
  /** Live draft reader (editor-first, like the send path). */
  getDraft: () => string;
  /** Draft writer (routes through the controlled value prop). */
  setDraft: (text: string) => void;
  onError?: (error: Error) => void;
};

export type UseEnhancePrompt = {
  isEnhancing: boolean;
  canRollback: boolean;
  /** Start (or re-run from the original) enhancement. False when there is
   *  nothing to do: empty draft or a request already in flight. */
  requestEnhance: () => Promise<boolean>;
  /** Roll back to the pre-enhance draft. False when no enhance result is shown. */
  rollbackEnhance: () => boolean;
  /** Cancel an in-flight request, keeping the current draft. */
  cancelEnhance: () => boolean;
  /** Handling Escape: cancel first, then roll back. True when consumed. */
  handleEscape: () => boolean;
  /** A user edit of the shown result drops the rollback state. */
  markEdited: () => void;
};

/**
 * One-shot enhance state machine for the composer draft.
 *
 * - `requestEnhance` stores the draft, runs the injected runner once, and
 *   replaces the draft with the result. A result is discarded (input left
 *   untouched) when the request was cancelled or the user typed meanwhile.
 * - Re-running always starts from the stored original, not the enhanced text.
 * - `markEdited` must be called for user-originated edits only
 *   (fromValueProp changes are programmatic and skip it).
 */
export function useEnhancePrompt(options: UseEnhancePromptOptions): UseEnhancePrompt {
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [canRollback, setCanRollback] = React.useState(false);
  const originalRef = React.useRef<string | null>(null);
  const requestIdRef = React.useRef(0);
  const inFlightRef = React.useRef(false);
  const cancelledRef = React.useRef(false);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const requestEnhance = React.useCallback(async (): Promise<boolean> => {
    const current = optionsRef.current;
    // Re-run from the stored original, never from the enhanced text.
    const source = originalRef.current ?? current.getDraft();
    if (source.trim().length === 0) return false;
    // The button shows a loader and overlapping requests are forbidden.
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    cancelledRef.current = false;
    originalRef.current = source;
    // Draft snapshot at request time: the resolve-time check compares
    // against this, not the stored original (on re-run the input already
    // holds the previous enhanced text).
    const draftAtRequest = current.getDraft();
    const requestId = (requestIdRef.current += 1);
    setCanRollback(false);
    setIsEnhancing(true);
    try {
      const enhanced = await current.runEnhance({ draft: source, requestId });
      // Cancelled while awaiting: drop the result.
      if (cancelledRef.current) return false;
      // The user typed meanwhile: never overwrite their input.
      if (current.getDraft() !== draftAtRequest) {
        originalRef.current = null;
        setCanRollback(false);
        return false;
      }
      current.setDraft(enhanced);
      setCanRollback(true);
      return true;
    } catch (error) {
      originalRef.current = null;
      setCanRollback(false);
      current.onError?.(error instanceof Error ? error : new Error('Enhance prompt request failed'));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsEnhancing(false);
    }
  }, []);

  const rollbackEnhance = React.useCallback((): boolean => {
    const original = originalRef.current;
    if (original === null) return false;
    originalRef.current = null;
    setCanRollback(false);
    optionsRef.current.setDraft(original);
    return true;
  }, []);

  const cancelEnhance = React.useCallback((): boolean => {
    if (!inFlightRef.current) return false;
    cancelledRef.current = true;
    inFlightRef.current = false;
    originalRef.current = null;
    setIsEnhancing(false);
    setCanRollback(false);
    return true;
  }, []);

  const handleEscape = React.useCallback((): boolean => {
    if (cancelEnhance()) return true;
    return rollbackEnhance();
  }, [cancelEnhance, rollbackEnhance]);

  const markEdited = React.useCallback((): void => {
    // Typing during a request is handled by the resolve-time draft check;
    // only a shown result loses its rollback on manual edit.
    if (inFlightRef.current) return;
    if (originalRef.current === null) return;
    originalRef.current = null;
    setCanRollback(false);
  }, []);

  return { isEnhancing, canRollback, requestEnhance, rollbackEnhance, cancelEnhance, handleEscape, markEdited };
}
