<template>
  <!-- Tras Keycloak: spinner mientras se intercambia el code; UI solo si hay error. -->
  <div class="min-h-screen" style="background: var(--app-bg)">
    <LoadingOverlay v-if="!error" message="Completando inicio de sesión…" />
    <div v-else class="flex min-h-screen items-center justify-center">
      <div class="ui-card max-w-md p-6 text-center">
        <h2 class="text-lg font-semibold text-[var(--text)]">No se pudo iniciar sesión</h2>
        <p class="mt-2 text-sm text-red-300">{{ error }}</p>
        <button type="button" class="ui-btn-primary mt-4 w-full" @click="retrySso">
          Reintentar SSO
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import LoadingOverlay from '../components/presentational/LoadingOverlay.vue';

const route = useRoute();
const router = useRouter();
const { completeOpenIdLogin, startOpenIdLogin } = useAuth();

const error = ref('');
let ran = false;

onMounted(async () => {
  if (ran) return;
  ran = true;

  const err = typeof route.query.error === 'string' ? route.query.error : '';
  if (err) {
    error.value =
      (typeof route.query.error_description === 'string' && route.query.error_description) ||
      err;
    return;
  }

  const code = typeof route.query.code === 'string' ? route.query.code : '';
  if (!code) {
    error.value = 'Falta el código de intercambio';
    return;
  }

  const lockKey = `openid_exchange_lock_${code}`;
  if (sessionStorage.getItem(lockKey) === 'done') {
    if (localStorage.getItem('accessToken')) {
      await router.replace('/');
      return;
    }
    error.value = 'Este código SSO ya se usó. Reintenta el inicio de sesión.';
    return;
  }
  if (sessionStorage.getItem(lockKey) === 'pending') {
    return;
  }
  sessionStorage.setItem(lockKey, 'pending');

  await router.replace({ path: '/auth/openid/callback' });

  try {
    await completeOpenIdLogin(code);
    sessionStorage.setItem(lockKey, 'done');
    await router.replace('/');
  } catch (exchangeError) {
    sessionStorage.removeItem(lockKey);
    error.value =
      exchangeError.response?.data?.message ||
      exchangeError.message ||
      'Error al intercambiar el código SSO';
  }
});

function retrySso() {
  sessionStorage.clear();
  startOpenIdLogin();
}
</script>
