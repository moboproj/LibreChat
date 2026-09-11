import { ref } from 'vue';

export type FeedbackVariant = 'error' | 'success' | 'info' | 'confirm';

export interface FeedbackState {
  open: boolean;
  variant: FeedbackVariant;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

type ConfirmResolver = ((value: boolean) => void) | null;

const state = ref<FeedbackState>({
  open: false,
  variant: 'info',
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
});

let confirmResolver: ConfirmResolver = null;

function close() {
  state.value.open = false;
  if (confirmResolver) {
    confirmResolver(false);
    confirmResolver = null;
  }
}

function show(variant: FeedbackVariant, title: string, message: string) {
  if (confirmResolver) {
    confirmResolver(false);
    confirmResolver = null;
  }
  state.value = {
    open: true,
    variant,
    title,
    message,
    confirmLabel: 'Aceptar',
    cancelLabel: 'Cancelar',
  };
}

export function useFeedback() {
  function showError(title: string, message: string) {
    show('error', title, message);
  }

  function showSuccess(title: string, message: string) {
    show('success', title, message);
  }

  function showInfo(title: string, message: string) {
    show('info', title, message);
  }

  function confirm(
    title: string,
    message: string,
    options?: { confirmLabel?: string; cancelLabel?: string },
  ): Promise<boolean> {
    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }
    state.value = {
      open: true,
      variant: 'confirm',
      title,
      message,
      confirmLabel: options?.confirmLabel || 'Confirmar',
      cancelLabel: options?.cancelLabel || 'Cancelar',
    };
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function accept() {
    state.value.open = false;
    if (confirmResolver) {
      confirmResolver(true);
      confirmResolver = null;
    }
  }

  function dismiss() {
    close();
  }

  return {
    state,
    showError,
    showSuccess,
    showInfo,
    confirm,
    accept,
    dismiss,
  };
}
