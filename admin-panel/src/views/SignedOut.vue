<template>
  <div class="flex min-h-screen items-center justify-center" style="background: var(--app-bg)">
    <div class="ui-card max-w-md p-6 text-center">
      <h2 class="text-lg font-semibold text-[var(--text)]">Sesión cerrada</h2>
      <p class="mt-2 text-sm text-[var(--text-muted)]">
        Cerraste sesión en OmniChat Admin. Para volver a entrar usa SSO.
      </p>
      <button type="button" class="ui-btn-primary mt-6 w-full" @click="startOpenIdLogin">
        Iniciar sesión con SSO
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../composables/useAuth';

const { startOpenIdLogin } = useAuth();
</script>
