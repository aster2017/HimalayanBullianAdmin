'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog, type DialogVariant } from '@/shared/components/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
}

interface DialogContextValue {
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
  prompt: (message: string, opts?: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: DialogVariant;
  isPrompt: boolean;
  placeholder: string;
  promptValue: string;
}

const CLOSED: DialogState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
  isPrompt: false,
  placeholder: '',
  promptValue: '',
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(CLOSED);
  const resolveRef = useRef<((value: any) => void) | null>(null);

  const confirm = useCallback((message: string, opts: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: opts.title ?? 'Confirm',
        message,
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'default',
        isPrompt: false,
        placeholder: '',
        promptValue: '',
      });
    });
  }, []);

  const prompt = useCallback((message: string, opts: PromptOptions = {}): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: opts.title ?? 'Confirm',
        message,
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'default',
        isPrompt: true,
        placeholder: opts.placeholder ?? 'Enter notes (optional)...',
        promptValue: '',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const val = state.isPrompt ? state.promptValue : true;
    setState(CLOSED);
    resolveRef.current?.(val);
    resolveRef.current = null;
  }, [state.isPrompt, state.promptValue]);

  const handleCancel = useCallback(() => {
    setState(CLOSED);
    resolveRef.current?.(state.isPrompt ? null : false);
    resolveRef.current = null;
  }, [state.isPrompt]);

  const setPromptValue = useCallback((v: string) => {
    setState((s) => ({ ...s, promptValue: v }));
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        isPrompt={state.isPrompt}
        promptPlaceholder={state.placeholder}
        promptValue={state.promptValue}
        onPromptChange={setPromptValue}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}
