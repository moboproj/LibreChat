<template>
  <div class="ui-modal-overlay !bg-[var(--app-bg)]">
    <div class="ui-modal max-w-md text-center">
      <h2 class="text-xl font-semibold text-[var(--text)]">LibreChat Admin</h2>
      <p class="mt-2 text-sm text-[var(--text-muted)]">
        Introduce la contraseña de administrador
      </p>
      <form class="mt-6 flex flex-col gap-3 text-left" @submit.prevent="$emit('submit')">
        <div>
          <label class="ui-label">Email</label>
          <input
            :value="email"
            class="ui-input"
            type="email"
            placeholder="Email"
            required
            autofocus
            @input="$emit('update:email', $event.target.value)"
          />
        </div>
        <div>
          <label class="ui-label">Contraseña</label>
          <input
            :value="password"
            class="ui-input"
            type="password"
            placeholder="Contraseña"
            required
            @input="$emit('update:password', $event.target.value)"
          />
        </div>
        <button type="submit" class="ui-btn-primary mt-2 w-full">Entrar</button>
        <p v-if="error" class="text-center text-sm text-red-300">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
defineProps({
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  error: { type: String, default: '' },
});

defineEmits(['submit', 'update:email', 'update:password']);
</script>
