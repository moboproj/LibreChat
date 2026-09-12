<template>
  <div class="initializing-overlay" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.initializing-overlay {
  position: fixed;
  inset: 0;
  background: var(--app-bg, #212121);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 3000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top: 3px solid var(--accent, #10a37f);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.message {
  margin: 0;
  max-width: 18rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted, #b4b4b4);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: rgba(255, 255, 255, 0.35);
  }
}
</style>
