import { computed, ref, watch } from 'vue';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent as deleteAgentRequest,
} from '../api/agents';
import { fetchAgentOptions } from '../api/catalog';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

const emptyForm = () => ({
  name: '',
  description: '',
  instructions: '',
  provider: '',
  model: '',
  category: 'general',
  is_promoted: false,
  selectedTools: [],
});

export function useAgents() {
  const { showError, showSuccess, confirm } = useFeedback();
  const agents = ref([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const saving = ref(false);
  const catalogLoading = ref(false);
  const selectedAgent = ref(null);
  const showDetail = ref(false);
  const showForm = ref(false);
  const editingAgent = ref(null);
  const formData = ref(emptyForm());
  const catalog = ref({
    providers: [],
    modelsByProvider: {},
    builtinTools: [],
    mcpServers: [],
    meta: {},
  });

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadAgents(),
  });

  const modelsForProvider = computed(() => {
    const provider = formData.value.provider;
    return catalog.value.modelsByProvider?.[provider] || [];
  });

  async function loadCatalog() {
    catalogLoading.value = true;
    try {
      const response = await fetchAgentOptions();
      catalog.value = response.data || catalog.value;
      if (!formData.value.provider && catalog.value.providers?.length) {
        formData.value.provider = catalog.value.providers[0];
      }
      syncModelToCatalog();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar catálogo'), getErrorMessage(error));
    } finally {
      catalogLoading.value = false;
    }
  }

  function syncModelToCatalog() {
    const models = modelsForProvider.value;
    if (!models.length) {
      formData.value.model = '';
      return;
    }
    if (!models.includes(formData.value.model)) {
      formData.value.model = models[0];
    }
  }

  watch(
    () => formData.value.provider,
    () => {
      syncModelToCatalog();
    },
  );

  async function loadAgents() {
    loading.value = true;
    try {
      const response = await listAgents({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
      });
      agents.value = response.data.documents || [];
      pagination.applyMeta(response.data);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar agentes'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function openDetail(agent) {
    showDetail.value = true;
    selectedAgent.value = agent;
    detailLoading.value = true;
    try {
      const id = agent.id || agent._id;
      const response = await getAgent(id);
      selectedAgent.value = response.data.document || agent;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar agente'), getErrorMessage(error));
    } finally {
      detailLoading.value = false;
    }
  }

  function closeDetail() {
    showDetail.value = false;
    selectedAgent.value = null;
  }

  async function openCreateForm() {
    editingAgent.value = null;
    formData.value = emptyForm();
    showForm.value = true;
    await loadCatalog();
  }

  async function openEditForm(agent) {
    editingAgent.value = agent;
    showForm.value = true;
    detailLoading.value = true;
    try {
      await loadCatalog();
      const id = agent.id || agent._id;
      const response = await getAgent(id);
      const full = response.data.document || agent;
      editingAgent.value = full;
      formData.value = {
        name: full.name || '',
        description: full.description || '',
        instructions: full.instructions || '',
        provider: full.provider || catalog.value.providers[0] || '',
        model: full.model || '',
        category: full.category || 'general',
        is_promoted: Boolean(full.is_promoted),
        selectedTools: [...(full.tools || [])],
      };
      // Ensure current provider/model exist in catalog lists
      if (full.provider && !catalog.value.providers.includes(full.provider)) {
        catalog.value.providers = [...catalog.value.providers, full.provider].sort();
      }
      if (full.provider && full.model) {
        const list = new Set(catalog.value.modelsByProvider[full.provider] || []);
        list.add(full.model);
        catalog.value.modelsByProvider[full.provider] = [...list].sort();
      }
      syncModelToCatalog();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar agente'), getErrorMessage(error));
      showForm.value = false;
    } finally {
      detailLoading.value = false;
    }
  }

  function closeForm() {
    showForm.value = false;
    editingAgent.value = null;
    formData.value = emptyForm();
  }

  function toggleTool(toolId) {
    const set = new Set(formData.value.selectedTools);
    if (set.has(toolId)) set.delete(toolId);
    else set.add(toolId);
    formData.value.selectedTools = [...set];
  }

  function isToolSelected(toolId) {
    return formData.value.selectedTools.includes(toolId);
  }

  function toggleMcpServer(server) {
    const serverToken = server.tools.find((t) => t.id.includes('sys__server__sys'))?.id;
    const toolIds = server.tools.map((t) => t.id);
    const allSelected = toolIds.every((id) => formData.value.selectedTools.includes(id));
    const set = new Set(formData.value.selectedTools);
    if (allSelected) {
      for (const id of toolIds) set.delete(id);
    } else {
      for (const id of toolIds) set.add(id);
      if (serverToken) set.add(serverToken);
    }
    formData.value.selectedTools = [...set];
  }

  function mcpServerSelectedCount(server) {
    return server.tools.filter((t) => formData.value.selectedTools.includes(t.id)).length;
  }

  async function saveAgent() {
    if (!formData.value.provider || !formData.value.model) {
      showError('Catálogo incompleto', 'Debes seleccionar provider y model del catálogo.');
      return;
    }
    saving.value = true;
    try {
      const payload = {
        name: formData.value.name,
        description: formData.value.description,
        instructions: formData.value.instructions,
        provider: formData.value.provider,
        model: formData.value.model,
        category: formData.value.category,
        is_promoted: formData.value.is_promoted,
        tools: formData.value.selectedTools,
      };
      if (editingAgent.value) {
        const id = editingAgent.value.id || editingAgent.value._id;
        await updateAgent(id, payload);
        showSuccess('Agente actualizado', 'Los cambios se guardaron correctamente.');
      } else {
        await createAgent(payload);
        showSuccess('Agente creado', 'El agente se creó correctamente.');
      }
      closeForm();
      closeDetail();
      await loadAgents();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al guardar agente'), getErrorMessage(error));
    } finally {
      saving.value = false;
    }
  }

  async function removeAgent(agent) {
    const label = agent?.name || agent?.id || 'este agente';
    const ok = await confirm(
      'Eliminar agente',
      `¿Seguro que deseas eliminar "${label}"? Esta acción afecta la misma DB de LibreChat.`,
      { confirmLabel: 'Eliminar' },
    );
    if (!ok) return;
    try {
      const id = agent.id || agent._id;
      await deleteAgentRequest(id);
      showSuccess('Agente eliminado', 'El agente se eliminó correctamente.');
      closeDetail();
      await loadAgents();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al eliminar agente'), getErrorMessage(error));
    }
  }

  return {
    agents,
    loading,
    detailLoading,
    saving,
    catalogLoading,
    catalog,
    modelsForProvider,
    selectedAgent,
    showDetail,
    showForm,
    editingAgent,
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
    loadAgents,
    loadCatalog,
    openDetail,
    closeDetail,
    openCreateForm,
    openEditForm,
    closeForm,
    toggleTool,
    isToolSelected,
    toggleMcpServer,
    mcpServerSelectedCount,
    saveAgent,
    removeAgent,
  };
}
