<template>
  <div class="login-overlay">
    <div class="login-box">
      <h2>LibreChat Admin</h2>
      <p>Introduce la contraseña de administrador</p>
      <form @submit.prevent="$emit('submit')">
        <input
          :value="email"
          type="email"
          placeholder="Email"
          required
          autofocus
          @input="$emit('update:email', $event.target.value)"
        />
        <input
          :value="password"
          type="password"
          placeholder="Contraseña"
          required
          @input="$emit('update:password', $event.target.value)"
        />
        <button type="submit" class="btn btn-primary">Entrar</button>
        <p v-if="error" class="error">{{ error }}</p>
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

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.login-box {
  background: #1e293b;
  padding: 40px;
  border-radius: 12px;
  border: 1px solid #334155;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-box h2 {
  color: #f1f5f9;
  margin-bottom: 10px;
}

.login-box p {
  color: #94a3b8;
  margin-bottom: 25px;
}

.login-box form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-box input {
  padding: 12px 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 16px;
}

.error {
  color: #f87171;
  font-size: 14px;
  margin-top: 10px;
}

.btn-primary {
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}
</style>
