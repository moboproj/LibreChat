import { ref } from 'vue';
import yaml from 'js-yaml';
import {
  listMcpServers,
  getMcpServer,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer as deleteMcpServerRequest,
} from '../api/mcpServers';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

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
  const { showError, showSuccess, confirm } = useFeedback();
  const servers = ref([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const showCreateForm = ref(false);
  const showDetail = ref(false);
  const selectedServer = ref(null);
  const editingServer = ref(null);
  const mode = ref('form');
  const formData = ref(emptyForm());

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadServers(),
  });

  async function loadServers() {
    loading.value = true;
    try {
      const response = await listMcpServers({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
      });
      const rawServers = response.data.documents || [];
      servers.value = rawServers.map(normalizeServer);
      pagination.applyMeta(response.data);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      showError(getErrorTitle(error, 'Error al cargar MCP Servers'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function openDetail(server) {
    showDetail.value = true;
    selectedServer.value = server;
    detailLoading.value = true;
    try {
      const response = await getMcpServer(server._id || server.serverName);
      selectedServer.value = normalizeServer(response.data.document || server);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar MCP'), getErrorMessage(error));
    } finally {
      detailLoading.value = false;
    }
  }

  function closeDetail() {
    showDetail.value = false;
    selectedServer.value = null;
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
      showError('Error de formato', e.message || 'No se pudo convertir entre formatos');
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
        showSuccess('MCP actualizado', 'El servidor se actualizó correctamente.');
      } else {
        await createMcpServer(payload);
        showSuccess('MCP creado', 'El servidor se creó correctamente.');
      }
      closeForm();
      await loadServers();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al guardar MCP'), getErrorMessage(error));
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
    const ok = await confirm('Eliminar MCP Server', '¿Seguro que deseas eliminar este servidor?', {
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await deleteMcpServerRequest(id);
      showSuccess('MCP eliminado', 'El servidor se eliminó correctamente.');
      await loadServers();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al eliminar MCP'), getErrorMessage(error));
    }
  }

  return {
    servers,
    loading,
    detailLoading,
    showCreateForm,
    showDetail,
    selectedServer,
    editingServer,
    mode,
    formData,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    rangeLabel: pagination.rangeLabel,
    searchQuery: pagination.searchQuery,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    loadServers,
    openDetail,
    closeDetail,
    setMode,
    editServer,
    saveServer,
    closeForm,
    openCreateForm,
    removeServer,
  };
}
