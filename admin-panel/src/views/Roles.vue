<template>
  <div class="roles-container">
    <div class="header-actions">
      <button class="btn btn-primary" @click="showCreateForm = true">➕ Nuevo Rol</button>
    </div>

    <div v-if="loading" class="loading">Cargando roles...</div>

    <div v-if="!loading && roles.length" class="roles-grid">
      <div v-for="role in roles" :key="role._id" class="role-card">
        <div class="card-header">
          <h4>{{ role.name }}</h4>
          <div class="card-actions">
            <button class="btn-icon" @click="editRole(role)" title="Editar">✏️</button>
            <button class="btn-icon danger" @click="deleteRole(role._id)" title="Eliminar">
              🗑️
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="permissions-list">
            <h5>Permisos:</h5>
            <div v-for="(perms, type) in role.permissions" :key="type" class="perm-group">
              <div class="perm-type">{{ type }}</div>
              <div class="perm-values">
                <span
                  v-for="(value, perm) in perms"
                  :key="perm"
                  :class="['perm-badge', { active: value }]"
                >
                  {{ perm }}: {{ value ? '✓' : '✗' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !roles.length" class="empty-state">
      <p>No hay roles configurados</p>
    </div>

    <div v-if="showCreateForm" class="modal-overlay" @click="closeForm">
      <div class="modal" @click.stop>
        <h3>{{ editingRole ? 'Editar Rol' : 'Nuevo Rol' }}</h3>
        <form @submit.prevent="saveRole">
          <div class="form-group">
            <label>Nombre del Rol</label>
            <input v-model="formData.name" type="text" required />
          </div>
          
          <div class="permissions-editor">
            <label>Configuración de Permisos</label>
            <div class="perm-grid-editor">
              <div v-for="(actions, type) in permissionMap" :key="type" class="perm-type-section">
                <h6>{{ type }}</h6>
                <div class="actions-grid">
                  <label v-for="action in actions" :key="action" class="checkbox-label">
                    <input 
                      type="checkbox" 
                      v-model="formData.permissions[type][action]"
                    />
                    {{ action }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              {{ editingRole ? 'Actualizar' : 'Crear' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeForm">
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
  name: 'Roles',
  data() {
    return {
      roles: [],
      loading: false,
      showCreateForm: false,
      editingRole: null,
      permissionMap: {
        BOOKMARKS: ['USE'],
        PROMPTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
        MEMORIES: ['USE', 'CREATE', 'UPDATE', 'READ', 'OPT_OUT'],
        AGENTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
        MULTI_CONVO: ['USE'],
        TEMPORARY_CHAT: ['USE'],
        RUN_CODE: ['USE'],
        WEB_SEARCH: ['USE'],
        PEOPLE_PICKER: ['VIEW_USERS', 'VIEW_GROUPS', 'VIEW_ROLES'],
        MARKETPLACE: ['USE'],
        FILE_SEARCH: ['USE'],
        FILE_CITATIONS: ['USE'],
        MCP_SERVERS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
        REMOTE_AGENTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
      },
      formData: {
        name: '',
        permissions: this.getDefaultPermissions(),
      },
    };
  },
  mounted() {
    this.loadRoles();
  },
  methods: {
    getDefaultPermissions() {
      const perms = {};
      const structure = {
        BOOKMARKS: { USE: true },
        PROMPTS: { USE: true, CREATE: true, SHARE: false, SHARE_PUBLIC: false },
        MEMORIES: { USE: true, CREATE: true, UPDATE: true, READ: true, OPT_OUT: true },
        AGENTS: { USE: true, CREATE: true, SHARE: false, SHARE_PUBLIC: false },
        MULTI_CONVO: { USE: true },
        TEMPORARY_CHAT: { USE: true },
        RUN_CODE: { USE: true },
        WEB_SEARCH: { USE: true },
        PEOPLE_PICKER: { VIEW_USERS: true, VIEW_GROUPS: true, VIEW_ROLES: true },
        MARKETPLACE: { USE: false },
        FILE_SEARCH: { USE: true },
        FILE_CITATIONS: { USE: true },
        MCP_SERVERS: { USE: true, CREATE: true, SHARE: false, SHARE_PUBLIC: false },
        REMOTE_AGENTS: { USE: false, CREATE: false, SHARE: false, SHARE_PUBLIC: false },
      };
      return JSON.parse(JSON.stringify(structure));
    },
    async loadRoles() {
      this.loading = true;
      try {
        const response = await this.$axios.get('/api/roles?limit=100');
        this.roles = response.data.documents || [];
      } catch (error) {
        console.error('Error loading roles:', error);
        alert('Error cargando roles: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    editRole(role) {
      this.editingRole = role;
      // Merge with default to ensure all keys exist for the UI
      const base = this.getDefaultPermissions();
      const merged = { ...base };

      if (role.permissions) {
        for (const type in role.permissions) {
          merged[type] = { ...base[type], ...role.permissions[type] };
        }
      }

      this.formData = {
        name: role.name,
        permissions: merged,
      };
      this.showCreateForm = true;
    },
    async saveRole() {
      try {
        const payload = {
          name: this.formData.name,
          permissions: this.formData.permissions,
        };

        if (this.editingRole) {
          await this.$axios.put(`/api/roles/${this.editingRole._id}`, payload);
          alert('Rol actualizado');
        } else {
          await this.$axios.post('/api/roles', payload);
          alert('Rol creado');
        }
        this.closeForm();
        this.loadRoles();
      } catch (error) {
        alert('Error guardando rol: ' + error.message);
      }
    },
    closeForm() {
      this.showCreateForm = false;
      this.editingRole = null;
      this.formData = {
        name: '',
        permissions: this.getDefaultPermissions(),
      };
    },
    async deleteRole(id) {
      if (confirm('¿Eliminar rol?')) {
        try {
          await this.$axios.delete(`/api/roles/${id}`);
          alert('Rol eliminado');
          this.loadRoles();
        } catch (error) {
          alert('Error eliminando rol: ' + error.message);
        }
      }
    },
  },
};
</script>

<style scoped>
.roles-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-actions {
  display: flex;
  gap: 15px;
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

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.role-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.card-header h4 {
  margin: 0;
  color: #f1f5f9;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-body {
  padding: 15px;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permissions-list h5 {
  margin: 0 0 10px 0;
  color: #cbd5e1;
  font-size: 12px;
  text-transform: uppercase;
}

.perm-group {
  background: #0f172a;
  padding: 10px;
  border-radius: 6px;
}

.perm-type {
  font-size: 12px;
  font-weight: 600;
  color: #60a5fa;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.perm-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.perm-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #475569;
  color: #cbd5e1;
}

.perm-badge.active {
  background: #065f46;
  color: #86efac;
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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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
.form-group textarea {
  width: 100%;
  padding: 10px 15px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 14px;
}

.code-input {
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 200px;
}

.permissions-editor {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permissions-editor > label {
  font-weight: 600;
  color: #60a5fa;
  font-size: 14px;
}

.perm-grid-editor {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  background: #0f172a;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #334155;
}

.perm-type-section {
  background: #1e293b;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #334155;
}

.perm-type-section h6 {
  margin: 0 0 10px 0;
  color: #94a3b8;
  font-size: 12px;
  text-transform: uppercase;
  border-bottom: 1px solid #334155;
  padding-bottom: 5px;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
}

.checkbox-label input {
  width: auto !important;
  margin: 0;
}

.checkbox-label:hover {
  color: #f1f5f9;
}

.form-group small {
  display: block;
  color: #64748b;
  margin-top: 5px;
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: #475569;
  color: #f1f5f9;
}

.btn-secondary:hover {
  background: #64748b;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #cbd5e1;
}
</style>
