/** One-click draft enhancement trigger in the composer footer (desktop). */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import {
    formatShortcutForDisplay,
    getEffectiveShortcutCombo,
} from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

type EnhancePromptButtonProps = {
    footerIconButtonClass: string;
    iconSizeClass: string;
    isEnhancing: boolean;
    disabled: boolean;
    onEnhance: () => void;
};

export const EnhancePromptButton = React.memo(function EnhancePromptButton(props: EnhancePromptButtonProps) {
    const { footerIconButtonClass, iconSizeClass, isEnhancing, disabled, onEnhance } = props;
    const { t } = useI18n();
    const enhancePromptShortcutOverride = useUIStore((state) => state.shortcutOverrides.enhance_prompt);
    const enhancePromptCombo = getEffectiveShortcutCombo(
        'enhance_prompt',
        enhancePromptShortcutOverride === undefined ? undefined : { enhance_prompt: enhancePromptShortcutOverride },
    );
    const shortcut = enhancePromptCombo ? formatShortcutForDisplay(enhancePromptCombo) : null;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(footerIconButtonClass, 'rounded-md', 'text-foreground hover:bg-[var(--interactive-hover)]/40')}
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                    onClick={onEnhance}
                    disabled={disabled || isEnhancing}
                    aria-label={t('chat.chatInput.enhance.toggleAria')}
                    aria-busy={isEnhancing}
                >
                    {isEnhancing
                        ? <Icon name="loader-4" className={cn(iconSizeClass, 'animate-spin')} />
                        : <Icon name="pencil-ai" className={cn(iconSizeClass)} />}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
                <div className="flex flex-col gap-0.5 text-center">
                    <span>{t('chat.chatInput.enhance.label')}</span>
                    {shortcut ? <span className="opacity-60">{shortcut}</span> : null}
                </div>
            </TooltipContent>
        </Tooltip>
    );
});
