import { ref, computed } from 'vue';
import yaml from 'js-yaml';
import {
  listMcpServers,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer as deleteMcpServerRequest,
} from '../api/mcpServers';

const emptyForm = () => ({
  serverName: '',
  description: '',
  type: 'streamable-http',
  url: '',
  headersJSON: '{}',
  customUserVarsJSON: '{}',
  capabilitiesJSON: '{"tools":{}}',
  toolFunctionsJSON: '{}',
  yamlContent: '',
});

function normalizeServer(server) {
  const config = { ...(server.config || {}) };

  if (typeof config.capabilities === 'string') {
    try {
      config.capabilities = JSON.parse(config.capabilities);
    } catch (e) {
      console.error('Failed to parse capabilities', e);
    }
  }

  if (typeof config.toolFunctions === 'string') {
    try {
      config.toolFunctions = JSON.parse(config.toolFunctions);
    } catch (e) {
      console.error('Failed to parse toolFunctions', e);
    }
  }

  if (!config.tools && config.capabilities?.tools) {
    const toolCount = Object.keys(config.capabilities.tools).length;
    config.tools = toolCount > 0 ? `${toolCount} tools` : '0 tools';
  } else if (typeof config.tools === 'number') {
    config.tools = `${config.tools} tools`;
  }

  return { ...server, config };
}

export function useMcpServers() {
  const servers = ref([]);
  const searchQuery = ref('');
  const loading = ref(false);
  const showCreateForm = ref(false);
  const editingServer = ref(null);
  const mode = ref('form');
  const formData = ref(emptyForm());

  const filteredServers = computed(() => {
    const q = searchQuery.value.toLowerCase();
    if (!q) return servers.value;
    return servers.value.filter((server) => server.serverName?.toLowerCase().includes(q));
  });

  async function loadServers() {
    loading.value = true;
    try {
      const response = await listMcpServers(100);
      const rawServers = response.data.documents || [];
      servers.value = rawServers.map(normalizeServer);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      alert('Error cargando MCP Servers: ' + error.message);
    } finally {
      loading.value = false;
    }
  }

  function getPayloadFromForm() {
    const capabilities = JSON.parse(formData.value.capabilitiesJSON || '{"tools":{}}');
    const toolFunctions = JSON.parse(formData.value.toolFunctionsJSON || '{}');
    const headers = JSON.parse(formData.value.headersJSON || '{}');
    const customUserVars = JSON.parse(formData.value.customUserVarsJSON || '{}');

    return {
      serverName: formData.value.serverName,
      config: {
        title: formData.value.serverName,
        description: formData.value.description,
        type: formData.value.type,
        url: formData.value.url,
        headers,
        customUserVars,
        requiresOAuth: false,
        capabilities,
        toolFunctions,
      },
    };
  }

  function setMode(newMode) {
    if (mode.value === newMode) return;

    try {
      if (newMode === 'yaml') {
        const currentConfig = getPayloadFromForm().config;
        const yamlObj = {
          serverName: formData.value.serverName,
          ...currentConfig,
        };
        formData.value.yamlContent = yaml.dump(yamlObj);
      } else {
        const yamlObj = yaml.load(formData.value.yamlContent);
        if (yamlObj) {
          formData.value.serverName = yamlObj.serverName || formData.value.serverName;
          formData.value.description = yamlObj.description || '';
          formData.value.type = yamlObj.type || 'streamable-http';
          formData.value.url = yamlObj.url || '';
          formData.value.headersJSON = JSON.stringify(yamlObj.headers || {}, null, 2);
          formData.value.customUserVarsJSON = JSON.stringify(yamlObj.customUserVars || {}, null, 2);
          formData.value.capabilitiesJSON = JSON.stringify(
            yamlObj.capabilities || { tools: {} },
            null,
            2,
          );
          formData.value.toolFunctionsJSON = JSON.stringify(yamlObj.toolFunctions || {}, null, 2);
        }
      }
      mode.value = newMode;
    } catch (e) {
      alert('Error al convertir entre formatos: ' + e.message);
    }
  }

  function editServer(server) {
    editingServer.value = server;
    formData.value = {
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
    mode.value = 'form';
    showCreateForm.value = true;
  }

  async function saveServer() {
    try {
      let payload;
      if (mode.value === 'yaml') {
        const yamlObj = yaml.load(formData.value.yamlContent);
        if (!yamlObj || !yamlObj.serverName) {
          throw new Error('El YAML debe contener al menos "serverName"');
        }
        const { serverName, ...config } = yamlObj;
        payload = { serverName, config };
      } else {
        payload = getPayloadFromForm();
      }

      if (editingServer.value) {
        await updateMcpServer(editingServer.value._id, payload);
        alert('MCP Server actualizado');
      } else {
        await createMcpServer(payload);
        alert('MCP Server creado');
      }
      closeForm();
      await loadServers();
    } catch (error) {
      alert('Error guardando MCP Server: ' + error.message);
    }
  }

  function closeForm() {
    showCreateForm.value = false;
    editingServer.value = null;
    mode.value = 'form';
    formData.value = emptyForm();
  }

  function openCreateForm() {
    closeForm();
    showCreateForm.value = true;
  }

  async function removeServer(id) {
    if (!confirm('¿Eliminar MCP Server?')) return;
    try {
      await deleteMcpServerRequest(id);
      alert('MCP Server eliminado');
      await loadServers();
    } catch (error) {
      alert('Error eliminando MCP Server: ' + error.message);
    }
  }

  return {
    servers,
    filteredServers,
    searchQuery,
    loading,
    showCreateForm,
    editingServer,
    mode,
    formData,
    loadServers,
    setMode,
    editServer,
    saveServer,
    closeForm,
    openCreateForm,
    removeServer,
  };
}
