import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Canary for the fork's own edits. An upstream merge can drop them without a
 * textual conflict (the surrounding code changed, the line itself did not), and
 * nothing else in the release gate would notice. These checks fail the release
 * instead of letting a build ship without the feature.
 */
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
const exists = (relative: string) => fs.existsSync(fileURLToPath(new URL(relative, import.meta.url)));

describe('fork guards: prompt enhance', () => {
    test('Composer wires the enhance hotkey and hook', () => {
        expect(read('../components/chat/ChatInput.tsx')).toContain("useKeybind('enhance_prompt'");
        expect(read('../components/chat/ChatInput.tsx')).toContain("from './hooks/useEnhancePrompt'");
        expect(read('../lib/shortcuts/config.ts')).toContain("id: 'enhance_prompt'");
    });

    test('enhance modules are present', () => {
        expect(exists('../components/chat/hooks/useEnhancePrompt.ts')).toBe(true);
        expect(exists('../lib/messages/enhancePrompt.ts')).toBe(true);
        expect(exists('../components/chat/composer/ui/EnhancePromptButton.tsx')).toBe(true);
    });

    test('enhance locale keys stay in en.ts and ru.ts', () => {
        const keys = [
            'chat.chatInput.enhance.label',
            'chat.chatInput.enhance.toast.failed.title',
            'chat.chatInput.enhance.toast.failed.description',
            'chat.chatInput.enhance.toggleAria',
        ];
        for (const file of ['./i18n/messages/en.ts', './i18n/messages/ru.ts']) {
            const source = read(file);
            for (const key of keys) expect(source).toContain(`'${key}'`);
        }
    });
});

describe('fork guards: model picker height', () => {
    test('ModelControls keeps the viewport-fixed popup: 600px on small screens, 640px otherwise', () => {
        const source = read('../components/chat/ModelControls.tsx');
        expect(source).toContain('h-[min(600px,calc(100dvh-2rem))]');
        expect(source).toContain('[@media(min-height:900px)]:h-[min(640px,calc(100dvh-2rem))]');
        expect(source).toContain("collisionAvoidance={{ side: 'shift', align: 'shift' }}");
    });

    test('ModelPickerList keeps the 640px popup', () => {
        expect(read('../components/model-picker/ModelPickerList.tsx')).toContain('min(640px,');
    });
});
