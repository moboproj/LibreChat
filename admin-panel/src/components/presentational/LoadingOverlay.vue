<template>
  <div class="initializing-overlay">
    <div class="spinner"></div>
  </div>
</template>

<script setup></script>

<style scoped>
.initializing-overlay {
  position: fixed;
  inset: 0;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #1e293b;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
