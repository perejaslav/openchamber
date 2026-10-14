import type { Message, Part } from '@/lib/opencode/model';
import { isConversationRole } from '@/lib/opencode/model';
import { requestSmallModel } from '@/lib/smallModelRequest';
import { getSessionLastAssistantModel } from '@/sync/session-actions';
import { useConfigStore } from '@/stores/useConfigStore';

/** Replicas of the dialog feeding one enhance call (plan §2). */
export const ENHANCE_CONTEXT_MESSAGES = 5;
/** Per-replica cap so secrets and pastes cannot blow up the request. */
export const ENHANCE_CONTEXT_CHARS = 2_000;

// System prompt mirrors commands/enhance.md byte-for-byte (frontmatter and
// the `Черновик: $ARGUMENTS` line stripped — the draft travels separately).
// Keep both texts in sync when either changes; enhancePrompt.test.ts pins it.
export const ENHANCE_SYSTEM_PROMPT = [
  'Перепиши черновик пользователя в четкий структурированный промпт для кодинг-агента. Не выполняй задачу, только улучши формулировку.',
  '',
  'Правила:',
  '1. Сохрани исходный язык черновика и его смысл, не добавляй новых требований.',
  '2. Учти стек и архитектуру текущего проекта, если они видны из контекста.',
  '3. Добавь явные ограничения: что трогать / не трогать, критерии готовности.',
  '4. Выведи ТОЛЬКО готовый текст улучшенного промпта, без вводных слов и кавычек.',
].join('\n');

export class EnhancePromptError extends Error {}

type EnhanceRequestFields = {
  prompt: string;
  system: string;
  sessionID?: string;
  restrictToPreferredProvider: boolean;
  preferredProviderID?: string;
  preferredModelID?: string;
};

/**
 * Last conversation replicas as enhance context. Tool calls, tool outputs,
 * reasoning and other non-text parts never enter the request; every replica
 * is cut to ENHANCE_CONTEXT_CHARS. Returns '' when nothing quotable remains.
 */
export const buildEnhanceContext = (
  messages: readonly Message[],
  getParts: (messageId: string) => Part[] | undefined,
): string => {
  const conversation = messages.filter((message) => isConversationRole(message.role));
  const tail = conversation.slice(-ENHANCE_CONTEXT_MESSAGES);
  const replicas: string[] = [];
  for (const message of tail) {
    const texts = (getParts(message.id) ?? [])
      .filter((part) => part.type === 'text' && part.text.trim().length > 0)
      .map((part) => (part.type === 'text' ? part.text : ''));
    const combined = texts.join('\n').trim();
    if (!combined) continue;
    const clipped = combined.length > ENHANCE_CONTEXT_CHARS
      ? combined.slice(0, ENHANCE_CONTEXT_CHARS)
      : combined;
    replicas.push(`[${message.role}]\n${clipped}`);
  }
  return replicas.join('\n\n');
};

type RunEnhancePromptInput = {
  draft: string;
  context: string;
  sessionId: string | null;
  fallbackProviderID?: string;
  fallbackModelID?: string;
  signal: AbortSignal;
};

/**
 * One enhance call through the small-model endpoint. Throws
 * EnhancePromptError on any failure (the owner toasts, the draft survives);
 * aborts (cancel/timeout) propagate as-is and stay silent when superseded.
 */
export const runEnhancePrompt = async (input: RunEnhancePromptInput): Promise<string> => {
  const draft = input.draft.trim();
  if (!draft) throw new EnhancePromptError('empty draft');
  // The draft's session provider is authoritative; the composer picker only
  // serves as a fallback (same rule as notes distillation).
  const sessionModel = input.sessionId ? getSessionLastAssistantModel(input.sessionId) : null;
  const preferredProviderID = sessionModel?.providerID || input.fallbackProviderID || '';
  const preferredModelID = sessionModel?.modelID || input.fallbackModelID || '';
  const prompt = input.context
    ? `Контекст диалога (tool-вызовы исключены):\n${input.context}\n\nЧерновик:\n${draft}`
    : `Черновик:\n${draft}`;
  const fields: EnhanceRequestFields = {
    prompt,
    system: ENHANCE_SYSTEM_PROMPT,
    // Read by servers before 2026-10; newer ones stay on the named provider anyway.
    restrictToPreferredProvider: true,
  };
  if (input.sessionId) fields.sessionID = input.sessionId;
  if (preferredProviderID) fields.preferredProviderID = preferredProviderID;
  if (preferredModelID) fields.preferredModelID = preferredModelID;
  let response: Response;
  try {
    response = await requestSmallModel({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      signal: input.signal,
      // The owner toasts once via the hook's onError; stay silent here.
    }, { notifyOnError: false });
  } catch (error) {
    throw new EnhancePromptError(error instanceof Error ? error.message : 'enhance request failed');
  }
  if (!response.ok) throw new EnhancePromptError(`small model responded ${response.status}`);
  const payload = await response.json().catch(() => null) as { text?: unknown } | null;
  const enhanced = typeof payload?.text === 'string' ? payload.text.trim() : '';
  if (!enhanced) throw new EnhancePromptError('empty enhance result');
  return enhanced;
};

/** Composer picker's provider/model for the enhance fallback chain. */
export const readEnhanceFallbackModel = () => {
  const { currentProviderId, currentModelId } = useConfigStore.getState();
  return { providerID: currentProviderId || '', modelID: currentModelId || '' };
};
