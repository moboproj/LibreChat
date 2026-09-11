<template>
  <div
    v-if="state.open"
    class="ui-modal-overlay z-[60]"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="onOverlay"
  >
    <div class="ui-modal max-w-md" @click.stop>
      <div class="mb-3 flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
          :style="iconStyle"
          aria-hidden="true"
        >
          {{ icon }}
        </div>
        <div class="min-w-0 flex-1">
          <h3 :id="titleId" class="text-base font-semibold text-[var(--text)]">
            {{ state.title }}
          </h3>
          <p class="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-muted)]">
            {{ state.message }}
          </p>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button
          v-if="state.variant === 'confirm'"
          type="button"
          class="ui-btn-secondary"
          @click="dismiss"
        >
          {{ state.cancelLabel }}
        </button>
        <button
          type="button"
          :class="state.variant === 'error' ? 'ui-btn-secondary' : 'ui-btn-primary'"
          @click="onPrimary"
        >
          {{ state.variant === 'confirm' ? state.confirmLabel : 'Entendido' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFeedback } from '@/composables/useFeedback';

const titleId = 'feedback-modal-title';
const { state, accept, dismiss } = useFeedback();

const icon = computed(() => {
  if (state.value.variant === 'error') return '!';
  if (state.value.variant === 'success') return '✓';
  if (state.value.variant === 'confirm') return '?';
  return 'i';
});

const iconStyle = computed(() => {
  if (state.value.variant === 'error') {
    return 'background: rgba(248,113,113,0.15); color: #fca5a5';
  }
  if (state.value.variant === 'success') {
    return 'background: rgba(16,163,127,0.18); color: var(--accent)';
  }
  if (state.value.variant === 'confirm') {
    return 'background: rgba(56,189,248,0.15); color: #7dd3fc';
  }
  return 'background: rgba(255,255,255,0.08); color: var(--text)';
});

function onPrimary() {
  if (state.value.variant === 'confirm') {
    accept();
    return;
  }
  dismiss();
}

function onOverlay() {
  if (state.value.variant === 'confirm') return;
  dismiss();
}
</script>
