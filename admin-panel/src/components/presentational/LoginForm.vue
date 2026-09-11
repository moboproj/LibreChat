<template>
  <div class="ui-modal-overlay !bg-[var(--app-bg)]">
    <div class="ui-modal max-w-md text-center">
      <h2 class="text-xl font-semibold text-[var(--text)]">OmniChat Admin</h2>
      <p class="mt-2 text-sm text-[var(--text-muted)]">
        {{
          openidEnabled
            ? 'Acceso solo con SSO corporativo'
            : 'SSO no está configurado en el servidor'
        }}
      </p>

      <div class="mt-6 space-y-3">
        <button
          v-if="openidEnabled"
          type="button"
          class="ui-btn-primary w-full"
          @click="$emit('sso')"
        >
          {{ openidButtonLabel }}
        </button>
        <p v-else class="text-sm text-red-300">
          Define OPENID_ISSUER y OPENID_CLIENT_ID en .env.admin y reinicia mongodb-api.
        </p>
        <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  error: { type: String, default: '' },
  openidEnabled: { type: Boolean, default: false },
  openidButtonLabel: { type: String, default: 'Iniciar sesión con SSO' },
});

defineEmits(['sso']);
</script>
