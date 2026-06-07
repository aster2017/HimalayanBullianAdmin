'use client';

import { useEffect, useRef } from 'react';

export type DialogVariant = 'default' | 'danger' | 'warning';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptValue?: string;
  onPromptChange?: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

const DangerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={20} height={20}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
  </svg>
);

const VARIANT_CFG = {
  default: {
    iconBg: 'rgba(200,168,107,0.12)',
    iconColor: '#C8A86B',
    confirmBg: '#C8A86B',
    confirmHover: '#b8975a',
    Icon: QuestionIcon,
  },
  danger: {
    iconBg: 'rgba(220,38,38,0.08)',
    iconColor: '#dc2626',
    confirmBg: '#dc2626',
    confirmHover: '#b91c1c',
    Icon: DangerIcon,
  },
  warning: {
    iconBg: 'rgba(217,119,6,0.1)',
    iconColor: '#d97706',
    confirmBg: '#d97706',
    confirmHover: '#b45309',
    Icon: WarningIcon,
  },
} as const;

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isPrompt = false,
  promptPlaceholder = 'Enter notes (optional)...',
  promptValue = '',
  onPromptChange,
  onConfirm,
  onCancel,
}: Props) {
  const cfg = VARIANT_CFG[variant];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (isPrompt) textareaRef.current?.focus();
      else confirmBtnRef.current?.focus();
    }, 50);
  }, [open, isPrompt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Enter' && !isPrompt) { e.preventDefault(); onConfirm(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPrompt, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes hbc-dialog-pop {
          from { opacity: 0; transform: scale(0.94) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .hbc-dialog-card { animation: hbc-dialog-pop 0.16s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15,23,42,0.48)', backdropFilter: 'blur(3px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div className="hbc-dialog-card bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: cfg.iconBg, color: cfg.iconColor }}
              >
                <cfg.Icon />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[0.9375rem] font-semibold leading-snug" style={{ color: '#0f172a' }}>
                  {title}
                </h3>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed" style={{ color: '#64748b' }}>
                  {message}
                </p>
                {isPrompt && (
                  <textarea
                    ref={textareaRef}
                    value={promptValue}
                    onChange={(e) => onPromptChange?.(e.target.value)}
                    placeholder={promptPlaceholder}
                    rows={3}
                    className="mt-3 w-full text-[0.8125rem] rounded-lg px-3 py-2 resize-none outline-none transition-shadow"
                    style={{
                      border: '1px solid #e2e8f0',
                      color: '#1e293b',
                      background: '#f8fafc',
                    }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${cfg.iconColor}40`)}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-5 flex justify-end gap-2.5">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-[0.8125rem] font-medium rounded-lg transition-colors"
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              className="px-4 py-2 text-[0.8125rem] font-medium rounded-lg text-white transition-colors"
              style={{ background: cfg.confirmBg }}
              onMouseEnter={(e) => { e.currentTarget.style.background = cfg.confirmHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = cfg.confirmBg; }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
