<template>
  <div class="users-container">
    <div class="header-actions">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar usuario..."
          @input="filterUsers"
        />
      </div>
      <button class="btn btn-primary" @click="showCreateForm = true">➕ Nuevo Usuario</button>
    </div>

    <div v-if="loading" class="loading">Cargando usuarios...</div>

    <div v-if="!loading && filteredUsers.length" class="users-table">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user._id">
            <td>{{ user.email }}</td>
            <td>{{ user.name || '-' }}</td>
            <td>
              <span :class="['role-badge', user.role?.toLowerCase()]">
                {{ user.role || 'USER' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="actions">
              <button class="btn-icon" @click="editUser(user)" title="Editar">✏️</button>
              <button class="btn-icon danger" @click="deleteUser(user._id)" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !filteredUsers.length" class="empty-state">
      <p>No hay usuarios</p>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="showCreateForm = false">
      <div class="modal" @click.stop>
        <h3>{{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>Email</label>
            <input v-model="formData.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="formData.name" type="text" />
          </div>
          <div v-if="!editingUser || showPasswordField" class="form-group">
            <div class="password-label-row">
              <label>{{ editingUser ? 'Nueva Contraseña' : 'Contraseña' }}</label>
              <button
                type="button"
                class="btn-generate"
                @click="generatePassword"
                title="Generar contraseña aleatoria"
              >
                🔐 Generar
              </button>
            </div>
            <div class="password-input-wrapper">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!editingUser"
                placeholder="Ingresa o genera una contraseña"
              />
              <button
                type="button"
                class="btn-toggle-password"
                @click="togglePasswordVisibility"
                :title="showPassword ? 'Ocultar' : 'Mostrar'"
              >
                {{ showPassword ? '👁️‍🗨️' : '👁️' }}
              </button>
              <button
                v-if="formData.password"
                type="button"
                class="btn-copy-password"
                @click="copyPasswordToClipboard"
                :title="copyFeedback"
              >
                {{ copyFeedback === 'Copiado!' ? '✅' : '📋' }}
              </button>
            </div>
            <div v-if="formData.password" class="password-strength">
              <div class="strength-bar">
                <div
                  :class="['strength-fill', getPasswordStrength().level]"
                  :style="{ width: getPasswordStrength().percentage + '%' }"
                ></div>
              </div>
              <small :class="['strength-text', getPasswordStrength().level]">
                Fortaleza: {{ getPasswordStrength().text }}
              </small>
            </div>
            <small v-if="editingUser" class="form-hint"
              >Dejar vacío para no cambiar la contraseña</small
            >
          </div>
          <div
            v-if="editingUser && !showPasswordField"
            class="form-group password-change-container"
          >
            <button
              type="button"
              class="btn btn-password-trigger"
              @click="showPasswordField = true"
            >
              🔐 Cambiar Contraseña del Usuario
            </button>
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="formData.role">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              {{ editingUser ? 'Actualizar' : 'Crear' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="showCreateForm = false">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Users',
  data() {
    return {
      users: [],
      filteredUsers: [],
      searchQuery: '',
      loading: false,
      showCreateForm: false,
      showPasswordField: false,
      showPassword: false,
      copyFeedback: '📋',
      editingUser: null,
      formData: {
        email: '',
        name: '',
        password: '',
        role: 'USER',
      },
    };
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const response = await this.$axios.get('/api/users?limit=100');
        this.users = response.data.documents || [];
        this.filteredUsers = [...this.users];
      } catch (error) {
        console.error('Error loading users:', error);
        alert('Error cargando usuarios: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    filterUsers() {
      this.filteredUsers = this.users.filter(
        (user) =>
          user.email?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          user.name?.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    },
    editUser(user) {
      this.editingUser = user;
      this.showPasswordField = false;
      this.formData = {
        email: user.email,
        name: user.name || '',
        password: '',
        role: user.role || 'USER',
      };
      this.showCreateForm = true;
    },
    async saveUser() {
      try {
        if (this.editingUser) {
          // Update existing user
          const updateData = {
            email: this.formData.email,
            name: this.formData.name,
            role: this.formData.role,
          };
          await this.$axios.put(`/api/users/${this.editingUser._id}`, updateData);

          // If password is provided, reset it
          if (this.formData.password) {
            await this.$axios.put(`/api/users/${this.editingUser._id}/password`, {
              password: this.formData.password,
            });
          }

          alert('Usuario actualizado');
        } else {
          // Create new user
          if (!this.formData.password) {
            alert('Contraseña es requerida');
            return;
          }
          await this.$axios.post('/api/users', this.formData);
          alert('Usuario creado exitosamente');
        }
        this.showCreateForm = false;
        this.showPasswordField = false;
        this.editingUser = null;
        this.formData = { email: '', name: '', password: '', role: 'USER' };
        this.loadUsers();
      } catch (error) {
        alert('Error guardando usuario: ' + error.message);
      }
    },
    async deleteUser(id) {
      if (confirm('¿Eliminar usuario?')) {
        try {
          await this.$axios.delete(`/api/users/${id}`);
          alert('Usuario eliminado');
          this.loadUsers();
        } catch (error) {
          alert('Error eliminando usuario: ' + error.message);
        }
      }
    },
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('es-ES');
    },
    generatePassword() {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const allChars = uppercase + lowercase + numbers + symbols;
      let password = '';

      // Asegurar al menos un carácter de cada tipo
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += symbols[Math.floor(Math.random() * symbols.length)];

      // Llenar el resto (total 16 caracteres)
      for (let i = password.length; i < 16; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }

      // Mezclar los caracteres
      password = password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');

      this.formData.password = password;
      this.showPassword = true;
      this.copyFeedback = '📋';
    },
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },
    copyPasswordToClipboard() {
      navigator.clipboard
        .writeText(this.formData.password)
        .then(() => {
          this.copyFeedback = '✅ Copiado!';
          setTimeout(() => {
            this.copyFeedback = '📋';
          }, 2000);
        })
        .catch(() => {
          alert('Error al copiar la contraseña');
        });
    },
    getPasswordStrength() {
      const password = this.formData.password;
      let strength = 0;

      if (!password) return { level: 'empty', percentage: 0, text: 'Vacío' };
      if (password.length >= 8) strength++;
      if (password.length >= 12) strength++;
      if (password.length >= 16) strength++;
      if (/[a-z]/.test(password)) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) strength++;

      let level = 'weak';
      let text = 'Débil';
      let percentage = (strength / 7) * 100;

      if (strength >= 6) {
        level = 'strong';
        text = 'Fuerte';
        percentage = 100;
      } else if (strength >= 4) {
        level = 'medium';
        text = 'Media';
        percentage = 66;
      } else if (strength >= 2) {
        level = 'fair';
        text = 'Aceptable';
        percentage = 33;
      }

      return { level, percentage, text };
    },
  },
};
</script>

<style scoped>
.users-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-box input {
  width: 100%;
  padding: 10px 15px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 14px;
}

.search-box input::placeholder {
  color: #64748b;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #475569;
  color: #f1f5f9;
}

.btn-secondary:hover {
  background: #64748b;
}

.users-table {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #0f172a;
}

th {
  padding: 15px;
  text-align: left;
  color: #cbd5e1;
  font-weight: 600;
  border-bottom: 2px solid #334155;
}

td {
  padding: 15px;
  border-bottom: 1px solid #334155;
  color: #e2e8f0;
}

tbody tr:hover {
  background: #334155;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.role-badge.admin {
  background: #fca5a5;
  color: #7f1d1d;
}

.role-badge.user {
  background: #a7f3d0;
  color: #065f46;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.btn-icon:hover {
  background: #475569;
}

.btn-icon.danger:hover {
  background: #f87171;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 25px;
  max-width: 500px;
  width: 90%;
}

.modal h3 {
  color: #f1f5f9;
  margin-top: 0;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  color: #cbd5e1;
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 15px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  flex: 1;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #cbd5e1;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  text-decoration: underline;
}

.btn-link:hover {
  color: #2563eb;
}

.form-hint {
  display: block;
  margin-top: 5px;
  color: #94a3b8;
  font-size: 12px;
}

.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.password-label-row label {
  color: #cbd5e1;
  font-weight: 500;
  font-size: 14px;
}

.btn-generate {
  background: none;
  border: 1px solid #3b82f6;
  color: #3b82f6;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn-generate:hover {
  background: #3b82f6;
  color: white;
}

.btn-password-trigger {
  width: 100%;
  background: #1e293b;
  border: 1px dashed #3b82f6;
  color: #60a5fa;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  margin: 10px 0;
}

.btn-password-trigger:hover {
  background: #3b82f6;
  color: white;
  border-style: solid;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  gap: 5px;
}

.password-input-wrapper input {
  flex: 1;
  padding: 10px 40px 10px 15px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 14px;
}

.btn-toggle-password,
.btn-copy-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 16px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.btn-toggle-password {
  right: 45px;
}

.btn-toggle-password:hover,
.btn-copy-password:hover {
  opacity: 1;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
}

.strength-fill.weak {
  background: #f87171;
}

.strength-fill.fair {
  background: #fbbf24;
}

.strength-fill.medium {
  background: #60a5fa;
}

.strength-fill.strong {
  background: #34d399;
}

.strength-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
}

.strength-text.weak {
  color: #f87171;
}

.strength-text.fair {
  color: #fbbf24;
}

.strength-text.medium {
  color: #60a5fa;
}

.strength-text.strong {
  color: #34d399;
}
</style>
