import { describe, expect, test } from 'bun:test'
import type { Message, Part } from '@/lib/opencode/model'

import {
  buildEnhanceContext,
  ENHANCE_CONTEXT_CHARS,
  ENHANCE_CONTEXT_MESSAGES,
  ENHANCE_SYSTEM_PROMPT,
} from './enhancePrompt'

const userMessage = (id: string): Message => ({
  id,
  sessionID: 'ses_1',
  role: 'user',
  time: { created: 1 },
})

const assistantMessage = (id: string): Message => ({
  id,
  sessionID: 'ses_1',
  role: 'assistant',
  time: { created: 2, completed: 3 },
  agent: 'build',
  providerID: 'provider',
  modelID: 'model',
})

const idleMessage = (id: string): Message => ({
  id,
  sessionID: 'ses_1',
  role: 'idle',
  time: { created: 3 },
  outcome: 'succeeded',
})

const textPart = (id: string, messageID: string, text: string): Part => ({
  id,
  sessionID: 'ses_1',
  messageID,
  type: 'text',
  text,
})

const toolPart = (id: string, messageID: string): Part => ({
  id,
  sessionID: 'ses_1',
  messageID,
  type: 'tool',
  callID: 'call_1',
  tool: 'edit',
  state: { status: 'completed', input: {}, output: 'SECRET-OUTPUT', time: { start: 1, end: 2 } },
})

describe('ENHANCE_SYSTEM_PROMPT', () => {
  test('matches commands/enhance.md byte-for-byte (minus frontmatter and the draft line)', () => {
    expect(ENHANCE_SYSTEM_PROMPT).toBe(
      'Ты — редактор промптов. Тебе дают ЧЕРНОВИК сообщения, которое пользователь собирается отправить кодинг-агенту. Твоя единственная задача — переписать черновик в чёткое сообщение для агента.\n'
      + '\n'
      + 'Черновик — не вопрос к тебе. Не отвечай на него, не выполняй задачу, не давай советов, не пиши код.\n'
      + '\n'
      + 'Правила:\n'
      + '1. Пиши от лица пользователя, обращаясь к агенту в повелительном наклонении: «Найди…», «Исправь…», «Не трогай…».\n'
      + '2. Сохрани язык и смысл черновика. Не добавляй требований, которых нет в черновике и которые не следуют из контекста диалога.\n'
      + '3. Если в контексте видны стек, файлы, ошибки — назови их конкретно. Если не видны — не выдумывай и не оставляй заглушек вида «(укажи…)».\n'
      + '4. Порядок: задача → что известно → ограничения (что трогать / не трогать) → критерий готовности. Для короткого черновика — 3–8 строк.\n'
      + '5. Выведи ТОЛЬКО текст переписанного сообщения: без заголовков, вступлений, пояснений, кавычек и markdown-обёрток.',
    );
  });
});

describe('buildEnhanceContext', () => {
  test('keeps the last replicas with role tags, skipping the rest', () => {
    const messages = [
      userMessage('u1'),
      assistantMessage('a1'),
      userMessage('u2'),
      assistantMessage('a2'),
      userMessage('u3'),
      assistantMessage('a3'),
      userMessage('u4'),
    ]
    const partsById = new Map<string, Part[]>()
    for (const m of messages) partsById.set(m.id, [textPart(`p-${m.id}`, m.id, `text-${m.id}`)])

    const context = buildEnhanceContext(messages, (id) => partsById.get(id))
    // 7 replicas, only the last ENHANCE_CONTEXT_MESSAGES survive.
    expect(ENHANCE_CONTEXT_MESSAGES).toBe(5)
    expect(context).toContain('[user]\ntext-u2')
    expect(context).toContain('[assistant]\ntext-a3')
    expect(context).not.toContain('text-u1')
    expect(context).not.toContain('text-a1')
  })

  test('excludes tool calls, outputs and non-conversation messages', () => {
    const messages = [userMessage('u1'), assistantMessage('a1'), idleMessage('i1')]
    const partsById = new Map<string, Part[]>([
      ['u1', [textPart('p1', 'u1', 'hello')]],
      ['a1', [textPart('p2', 'a1', 'hi'), toolPart('p3', 'a1')]],
    ])

    const context = buildEnhanceContext(messages, (id) => partsById.get(id))
    expect(context).toContain('hello')
    expect(context).toContain('hi')
    expect(context).not.toContain('SECRET-OUTPUT')
    expect(context).not.toContain('[idle]')
  })

  test('clips every replica to the char budget', () => {
    const messages = [userMessage('u1')]
    const partsById = new Map<string, Part[]>([['u1', [textPart('p1', 'u1', 'x'.repeat(ENHANCE_CONTEXT_CHARS + 50))]]])

    const context = buildEnhanceContext(messages, (id) => partsById.get(id))
    expect(context).toBe(`[user]\n${'x'.repeat(ENHANCE_CONTEXT_CHARS)}`)
  })

  test('returns empty string when nothing quotable remains', () => {
    expect(buildEnhanceContext([], () => undefined)).toBe('')
    expect(buildEnhanceContext([userMessage('u1')], () => undefined)).toBe('')
    expect(buildEnhanceContext([userMessage('u1')], () => [toolPart('p', 'u1')])).toBe('')
  })
})
