import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPEN_FOLDER_HOOK_RULES, ensureOpenFolderHooks } from '../../../../scripts/ru/fork-hooks.mjs';

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

describe('fork guards: Open in OpenChamber (Explorer context menu)', () => {
    test('the feature lives in a fork-owned file upstream never touches', () => {
        expect(exists('../../../electron/fork/open-folder-context-menu.mjs')).toBe(true);
        expect(exists('../../../electron/fork/open-folder-context-menu.test.mjs')).toBe(true);
    });

    test('main.mjs wires the feature in', () => {
        const source = read('../../../electron/main.mjs');
        expect(source).toContain("from './fork/open-folder-context-menu.mjs'");
        expect(source).toContain('createOpenFolderContextMenu({');
        expect(source).toContain('openFolderContextMenu.register();');
        expect(source).toContain('openFolderContextMenu.handleLaunch(process.argv);');
        expect(source).toContain('openFolderContextMenu.handleArgv(argv);');
    });

    test('the merge resolver knows how to re-apply the hooks', () => {
        const source = read('../../../../scripts/ru/resolve-merge-conflicts.mjs');
        expect(source).toContain('ensureOpenFolderHooks');
        expect(source).toContain('OPEN_FOLDER_HOOK_FILE');
    });

    test('the hooks come back on top of an upstream file', () => {
        // What the resolver does after taking upstream's side of a conflicted
        // main.mjs: strip the fork's edits, re-apply them, and the feature is
        // whole again. This is what keeps the feature alive across an
        // upstream merge without anyone touching it by hand.
        const upstream = read('../../../electron/main.mjs');
        const stripped = OPEN_FOLDER_HOOK_RULES.reduce(
            (source, rule) => source.replace(rule.to, rule.from),
            upstream,
        );
        expect(stripped).not.toContain('openFolderContextMenu');
        expect(stripped).not.toContain("from './fork/open-folder-context-menu.mjs'");

        const file = path.join(os.tmpdir(), `openchamber-main-${process.pid}.mjs`);
        fs.writeFileSync(file, stripped, 'utf8');
        try {
            expect(ensureOpenFolderHooks(file)).toBe(true);
            const restored = fs.readFileSync(file, 'utf8');
            expect(restored).toContain("from './fork/open-folder-context-menu.mjs'");
            expect(restored).toContain('openFolderContextMenu.register();');
            expect(restored).toContain('openFolderContextMenu.handleLaunch(process.argv);');
            expect(restored).toContain('openFolderContextMenu.handleArgv(argv);');
            // Applying it twice must not double the hooks.
            expect(ensureOpenFolderHooks(file)).toBe(false);
        } finally {
            fs.rmSync(file, { force: true });
        }
    });

    test('a changed upstream file fails loudly instead of losing the feature', () => {
        const file = path.join(os.tmpdir(), `openchamber-main-broken-${process.pid}.mjs`);
        fs.writeFileSync(file, 'const nothing = 1;\n', 'utf8');
        try {
            expect(() => ensureOpenFolderHooks(file)).toThrow();
        } finally {
            fs.rmSync(file, { force: true });
        }
    });
});
