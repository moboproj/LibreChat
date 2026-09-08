<template>
  <div class="mcp-container">
    <div class="header-actions">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar MCP Server..."
          @input="filterServers"
        />
      </div>
      <button class="btn btn-primary" @click="showCreateForm = true">➕ Nuevo MCP Server</button>
    </div>

    <div v-if="loading" class="loading">Cargando MCP Servers...</div>

    <div v-if="!loading && filteredServers.length" class="servers-grid">
      <div v-for="server in filteredServers" :key="server._id" class="server-card">
        <div class="card-header">
          <h4>{{ server.serverName }}</h4>
          <div class="card-actions">
            <button class="btn-icon" @click="editServer(server)" title="Editar">✏️</button>
            <button class="btn-icon danger" @click="deleteServer(server._id)" title="Eliminar">
              🗑️
            </button>
          </div>
        </div>
        <div class="card-body">
          <p v-if="server.config?.description" class="server-description">
            {{ server.config.description }}
          </p>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Tipo:</span>
              <span class="value badge">{{ server.config?.type || 'unknown' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Tools:</span>
              <span class="value">{{ server.config?.tools || '0 tools' }}</span>
            </div>
          </div>
          <div class="info-item full-width">
            <span class="label">URL:</span>
            <span class="value url-text">{{ server.config?.url || '-' }}</span>
          </div>
          <div class="card-footer">
            <span class="label">Creado:</span>
            <span class="value">{{ formatDate(server.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !filteredServers.length" class="empty-state">
      <p>No hay MCP Servers configurados</p>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeForm">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingServer ? 'Editar MCP Server' : 'Nuevo MCP Server' }}</h3>
          <div class="mode-toggle">
            <button :class="['mode-btn', { active: mode === 'form' }]" @click="setMode('form')">
              Formulario
            </button>
            <button :class="['mode-btn', { active: mode === 'yaml' }]" @click="setMode('yaml')">
              YAML (Raw)
            </button>
          </div>
        </div>

        <form @submit.prevent="saveServer">
          <!-- FORM MODE -->
          <div v-if="mode === 'form'">
            <div class="form-row">
              <div class="form-group flex-2">
                <label>Nombre del Servidor</label>
                <input
                  v-model="formData.serverName"
                  type="text"
                  placeholder="ej. mi-servidor"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label>Tipo</label>
                <select v-model="formData.type">
                  <option value="streamable-http">Streamable HTTP</option>
                  <option value="websocket">WebSocket</option>
                  <option value="sse">SSE</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Descripción</label>
              <textarea
                v-model="formData.description"
                rows="2"
                placeholder="ej. Servidor para consulta de base de datos de producción"
              ></textarea>
            </div>

            <div class="form-group">
              <label>URL</label>
              <input v-model="formData.url" type="url" placeholder="https://..." required />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Headers (JSON)</label>
                <textarea
                  v-model="formData.headersJSON"
                  class="code-input small"
                  placeholder='{"Authorization": "Bearer {{TOKEN}}"}'
                ></textarea>
              </div>
              <div class="form-group flex-1">
                <label>User Vars (JSON)</label>
                <textarea
                  v-model="formData.customUserVarsJSON"
                  class="code-input small"
                  placeholder='{"KEY": {"title": "Mi Key", "description": "..."}}'
                ></textarea>
              </div>
            </div>

            <div class="form-group">
              <label>Capabilities (JSON)</label>
              <textarea v-model="formData.capabilitiesJSON" class="code-input small"></textarea>
            </div>
          </div>

          <!-- YAML MODE -->
          <div v-else class="yaml-editor-container">
            <div class="form-group">
              <label>Configuración YAML</label>
              <textarea
                v-model="formData.yamlContent"
                class="code-input yaml-input"
                placeholder="serverName: mi-servidor&#10;type: sse&#10;url: http://...&#10;headers:&#10;  X-User: '{{LIBRECHAT_USER_ID}}'"
              ></textarea>
              <small class="help-text">Define el servidor usando formato YAML estándar.</small>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              {{ editingServer ? 'Actualizar' : 'Crear' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeForm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import yaml from 'js-yaml';

export default {
  name: 'MCPServers',
  data() {
    return {
      servers: [],
      filteredServers: [],
      searchQuery: '',
      loading: false,
      showCreateForm: false,
      editingServer: null,
      mode: 'form', // 'form' or 'yaml'
      formData: {
        serverName: '',
        description: '',
        type: 'streamable-http',
        url: '',
        headersJSON: '{}',
        customUserVarsJSON: '{}',
        capabilitiesJSON: '{"tools":{}}',
        toolFunctionsJSON: '{}',
        yamlContent: '',
      },
    };
  },
  mounted() {
    this.loadServers();
  },
  methods: {
    async loadServers() {
      this.loading = true;
      try {
        const response = await this.$axios.get('/api/mcpservers?limit=100');
        const rawServers = response.data.documents || [];
        this.servers = rawServers.map((server) => {
          const config = { ...(server.config || {}) };

          // Parse capabilities if stringified
          if (typeof config.capabilities === 'string') {
            try {
              config.capabilities = JSON.parse(config.capabilities);
            } catch (e) {
              console.error('Failed to parse capabilities', e);
            }
          }

          // Parse toolFunctions if stringified
          if (typeof config.toolFunctions === 'string') {
            try {
              config.toolFunctions = JSON.parse(config.toolFunctions);
            } catch (e) {
              console.error('Failed to parse toolFunctions', e);
            }
          }

          // Ensure tools count/list is accurate for display
          if (!config.tools && config.capabilities?.tools) {
            const toolCount = Object.keys(config.capabilities.tools).length;
            config.tools = toolCount > 0 ? `${toolCount} tools` : '0 tools';
          } else if (typeof config.tools === 'number') {
            config.tools = `${config.tools} tools`;
          }

          return { ...server, config };
        });
        this.filteredServers = [...this.servers];
      } catch (error) {
        console.error('Error loading MCP servers:', error);
        alert('Error cargando MCP Servers: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    filterServers() {
      this.filteredServers = this.servers.filter((server) =>
        server.serverName?.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    },
    setMode(newMode) {
      if (this.mode === newMode) return;

      try {
        if (newMode === 'yaml') {
          // Sync from form to YAML
          const currentConfig = this.getPayloadFromForm().config;
          const yamlObj = {
            serverName: this.formData.serverName,
            ...currentConfig,
          };
          this.formData.yamlContent = yaml.dump(yamlObj);
        } else {
          // Sync from YAML to form
          const yamlObj = yaml.load(this.formData.yamlContent);
          if (yamlObj) {
            this.formData.serverName = yamlObj.serverName || this.formData.serverName;
            this.formData.description = yamlObj.description || '';
            this.formData.type = yamlObj.type || 'streamable-http';
            this.formData.url = yamlObj.url || '';
            this.formData.headersJSON = JSON.stringify(yamlObj.headers || {}, null, 2);
            this.formData.customUserVarsJSON = JSON.stringify(
              yamlObj.customUserVars || {},
              null,
              2,
            );
            this.formData.capabilitiesJSON = JSON.stringify(
              yamlObj.capabilities || { tools: {} },
              null,
              2,
            );
            this.formData.toolFunctionsJSON = JSON.stringify(yamlObj.toolFunctions || {}, null, 2);
          }
        }
        this.mode = newMode;
      } catch (e) {
        alert('Error al convertir entre formatos: ' + e.message);
      }
    },
    editServer(server) {
      this.editingServer = server;
      this.formData = {
        serverName: server.serverName,
        description: server.config?.description || '',
        type: server.config?.type || 'streamable-http',
        url: server.config?.url || '',
        headersJSON: JSON.stringify(server.config?.headers || {}, null, 2),
        customUserVarsJSON: JSON.stringify(server.config?.customUserVars || {}, null, 2),
        capabilitiesJSON:
          typeof server.config?.capabilities === 'string'
            ? server.config.capabilities
            : JSON.stringify(server.config?.capabilities || { tools: {} }, null, 2),
        toolFunctionsJSON: JSON.stringify(server.config?.toolFunctions || {}, null, 2),
        yamlContent: '',
      };
      this.mode = 'form';
      this.showCreateForm = true;
    },
    getPayloadFromForm() {
      const capabilities = JSON.parse(this.formData.capabilitiesJSON || '{"tools":{}}');
      const toolFunctions = JSON.parse(this.formData.toolFunctionsJSON || '{}');
      const headers = JSON.parse(this.formData.headersJSON || '{}');
      const customUserVars = JSON.parse(this.formData.customUserVarsJSON || '{}');

      return {
        serverName: this.formData.serverName,
        config: {
          title: this.formData.serverName,
          description: this.formData.description,
          type: this.formData.type,
          url: this.formData.url,
          headers,
          customUserVars,
          requiresOAuth: false,
          capabilities,
          toolFunctions,
        },
      };
    },
    async saveServer() {
      try {
        let payload;
        if (this.mode === 'yaml') {
          const yamlObj = yaml.load(this.formData.yamlContent);
          if (!yamlObj || !yamlObj.serverName) {
            throw new Error('El YAML debe contener al menos "serverName"');
          }
          const { serverName, ...config } = yamlObj;
          payload = { serverName, config };
        } else {
          payload = this.getPayloadFromForm();
        }

        if (this.editingServer) {
          await this.$axios.put(`/api/mcpservers/${this.editingServer._id}`, payload);
          alert('MCP Server actualizado');
        } else {
          await this.$axios.post('/api/mcpservers', payload);
          alert('MCP Server creado');
        }
        this.closeForm();
        this.loadServers();
      } catch (error) {
        alert('Error guardando MCP Server: ' + error.message);
      }
    },
    closeForm() {
      this.showCreateForm = false;
      this.editingServer = null;
      this.mode = 'form';
      this.formData = {
        serverName: '',
        type: 'streamable-http',
        url: '',
        headersJSON: '{}',
        customUserVarsJSON: '{}',
        capabilitiesJSON: '{"tools":{}}',
        toolFunctionsJSON: '{}',
        yamlContent: '',
      };
    },
    async deleteServer(id) {
      if (confirm('¿Eliminar MCP Server?')) {
        try {
          await this.$axios.delete(`/api/mcpservers/${id}`);
          alert('MCP Server eliminado');
          this.loadServers();
        } catch (error) {
          alert('Error eliminando MCP Server: ' + error.message);
        }
      }
    },
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('es-ES');
    },
  },
};
</script>

<style scoped>
.mcp-container {
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

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.server-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.server-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1);
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
  font-size: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-description {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-item .label {
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.info-item .value {
  color: #f1f5f9;
  word-break: break-all;
}

.value.badge {
  background: #334155;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
  font-family: monospace;
  font-size: 11px;
}

.value.url-text {
  font-family: monospace;
  background: #0f172a;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #1e293b;
}

.card-footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-footer .label {
  color: #475569;
  font-size: 11px;
}

.card-footer .value {
  color: #64748b;
  font-size: 11px;
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
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal h3 {
  color: #f1f5f9;
  margin: 0;
}

.mode-toggle {
  display: flex;
  background: #0f172a;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #334155;
}

.mode-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #3b82f6;
  color: white;
}

.form-row {
  display: flex;
  gap: 15px;
}

.flex-1 {
  flex: 1;
}
.flex-2 {
  flex: 2;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  color: #cbd5e1;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 13px;
}

.code-input {
  font-family: 'Courier New', monospace;
}

.code-input.small {
  min-height: 60px;
}

.yaml-input {
  min-height: 300px;
}

.help-text {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 11px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

.form-actions button {
  flex: 1;
  padding: 12px;
}

.btn-secondary {
  background: #475569;
  color: #f1f5f9;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #cbd5e1;
}
</style>
