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
});

describe('fork guards: model picker height', () => {
    test('ModelControls keeps the 640px popup', () => {
        expect(read('../components/chat/ModelControls.tsx')).toContain('min(640px,');
    });

    test('ModelPickerList keeps the 640px popup', () => {
        expect(read('../components/model-picker/ModelPickerList.tsx')).toContain('min(640px,');
    });
});
