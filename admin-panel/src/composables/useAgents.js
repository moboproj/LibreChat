import { computed, ref, watch } from 'vue';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent as deleteAgentRequest,
  getAgentShareRoles,
  listAgentShareUsers,
  listAgentShareGroups,
  setAgentSharePermission,
} from '../api/agents';
import { listUsers } from '../api/users';
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
  ownerId: '',
  ownerLabel: '',
  avatarUrl: '',
  temperature: '',
  top_p: '',
  max_output_tokens: '',
  conversation_starters_text: '',
});

const FORM_TABS = [
  { id: 'general', label: 'General' },
  { id: 'mcp', label: 'MCP' },
  { id: 'share', label: 'Compartir' },
  { id: 'advanced', label: 'Avanzado' },
];

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
  const formTab = ref('general');
  const catalog = ref({
    providers: [],
    modelsByProvider: {},
    builtinTools: [],
    mcpServers: [],
    meta: {},
  });

  const shareRoles = ref([]);
  const sharePrincipalTab = ref('users');
  const shareUsers = ref([]);
  const shareGroups = ref([]);
  const shareLoading = ref(false);
  const shareSavingId = ref('');
  const shareUserSearch = ref('');
  const shareGroupSearch = ref('');
  const shareUserPage = ref(1);
  const shareGroupPage = ref(1);
  const shareUserTotal = ref(0);
  const shareGroupTotal = ref(0);
  const sharePageSize = 10;

  const ownerOptions = ref([]);
  const ownerSearch = ref('');
  const ownerLoading = ref(false);

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadAgents(),
  });

  const modelsForProvider = computed(() => {
    const provider = formData.value.provider;
    return catalog.value.modelsByProvider?.[provider] || [];
  });

  const canUseShareTab = computed(() => Boolean(editingAgent.value?._id || editingAgent.value?.id));

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

  async function searchOwners(query = '') {
    ownerLoading.value = true;
    ownerSearch.value = query;
    try {
      const response = await listUsers({ page: 1, limit: 20, search: query.trim() });
      ownerOptions.value = response.data.documents || [];
    } catch (error) {
      showError(getErrorTitle(error, 'Error al buscar usuarios'), getErrorMessage(error));
    } finally {
      ownerLoading.value = false;
    }
  }

  function selectOwner(user) {
    formData.value.ownerId = user?._id ? String(user._id) : '';
    formData.value.ownerLabel = user
      ? `${user.name || 'Sin nombre'} · ${user.username || user.email || user._id}`
      : '';
  }

  function clearOwner() {
    formData.value.ownerId = '';
    formData.value.ownerLabel = '';
  }

  function avatarUrlFromDoc(avatar) {
    if (!avatar) return '';
    if (typeof avatar === 'string') return avatar;
    return avatar.filepath || avatar.url || '';
  }

  function startersToText(starters) {
    if (!Array.isArray(starters)) return '';
    return starters.join('\n');
  }

  async function openCreateForm() {
    editingAgent.value = null;
    formData.value = emptyForm();
    formTab.value = 'general';
    showForm.value = true;
    await Promise.all([loadCatalog(), searchOwners(''), loadShareRoles()]);
  }

  async function openEditForm(agent) {
    editingAgent.value = agent;
    showForm.value = true;
    formTab.value = 'general';
    detailLoading.value = true;
    try {
      await Promise.all([loadCatalog(), loadShareRoles()]);
      const id = agent.id || agent._id;
      const response = await getAgent(id);
      const full = response.data.document || agent;
      editingAgent.value = full;
      const params = full.model_parameters || {};
      formData.value = {
        name: full.name || '',
        description: full.description || '',
        instructions: full.instructions || '',
        provider: full.provider || catalog.value.providers[0] || '',
        model: full.model || '',
        category: full.category || 'general',
        is_promoted: Boolean(full.is_promoted),
        selectedTools: [...(full.tools || [])],
        ownerId: full.author ? String(full.author) : '',
        ownerLabel: full.authorName
          ? `${full.authorName}${full.authorEmail ? ` · ${full.authorEmail}` : ''}`
          : '',
        avatarUrl: avatarUrlFromDoc(full.avatar),
        temperature: params.temperature ?? '',
        top_p: params.top_p ?? '',
        max_output_tokens: params.max_output_tokens ?? '',
        conversation_starters_text: startersToText(full.conversation_starters),
      };
      if (full.provider && !catalog.value.providers.includes(full.provider)) {
        catalog.value.providers = [...catalog.value.providers, full.provider].sort();
      }
      if (full.provider && full.model) {
        const list = new Set(catalog.value.modelsByProvider[full.provider] || []);
        list.add(full.model);
        catalog.value.modelsByProvider[full.provider] = [...list].sort();
      }
      syncModelToCatalog();
      await loadShareLists();
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
    formTab.value = 'general';
    shareUsers.value = [];
    shareGroups.value = [];
  }

  function setFormTab(tabId) {
    if (tabId === 'share' && !canUseShareTab.value) {
      showError(
        'Guarda el agente primero',
        'La pestaña Compartir está disponible después de crear el agente.',
      );
      return;
    }
    formTab.value = tabId;
    if (tabId === 'share') {
      void loadShareLists();
    }
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

  function buildPayload() {
    const model_parameters = {};
    if (formData.value.temperature !== '' && formData.value.temperature != null) {
      model_parameters.temperature = Number(formData.value.temperature);
    }
    if (formData.value.top_p !== '' && formData.value.top_p != null) {
      model_parameters.top_p = Number(formData.value.top_p);
    }
    if (formData.value.max_output_tokens !== '' && formData.value.max_output_tokens != null) {
      model_parameters.max_output_tokens = Number(formData.value.max_output_tokens);
    }

    return {
      name: formData.value.name,
      description: formData.value.description,
      instructions: formData.value.instructions,
      provider: formData.value.provider,
      model: formData.value.model,
      category: formData.value.category,
      is_promoted: formData.value.is_promoted,
      tools: formData.value.selectedTools,
      ownerId: formData.value.ownerId || undefined,
      avatar: formData.value.avatarUrl.trim() || null,
      model_parameters: Object.keys(model_parameters).length ? model_parameters : null,
      conversation_starters: formData.value.conversation_starters_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }

  async function saveAgent() {
    if (!formData.value.provider || !formData.value.model) {
      showError('Catálogo incompleto', 'Debes seleccionar provider y model del catálogo.');
      return;
    }
    saving.value = true;
    try {
      const payload = buildPayload();
      if (editingAgent.value) {
        const id = editingAgent.value.id || editingAgent.value._id;
        await updateAgent(id, payload);
        showSuccess('Agente actualizado', 'Los cambios se guardaron correctamente.');
        const refreshed = await getAgent(id);
        editingAgent.value = refreshed.data.document || editingAgent.value;
      } else {
        const created = await createAgent(payload);
        showSuccess('Agente creado', 'El agente se creó. Ya puedes configurar permisos.');
        const newId = created.data?.id || created.data?._id;
        if (newId) {
          const refreshed = await getAgent(newId);
          editingAgent.value = refreshed.data.document || {
            id: created.data.id,
            _id: created.data._id,
          };
          formTab.value = 'share';
          await loadShareLists();
        } else {
          closeForm();
        }
      }
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
      `¿Seguro que deseas eliminar "${label}"? Esta acción afecta la misma DB de Omnichat.`,
      { confirmLabel: 'Eliminar' },
    );
    if (!ok) return;
    try {
      const id = agent.id || agent._id;
      await deleteAgentRequest(id);
      showSuccess('Agente eliminado', 'El agente se eliminó correctamente.');
      closeDetail();
      closeForm();
      await loadAgents();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al eliminar agente'), getErrorMessage(error));
    }
  }

  async function loadShareRoles() {
    try {
      const response = await getAgentShareRoles();
      shareRoles.value = response.data.roles || [];
    } catch {
      shareRoles.value = [
        { id: 'agent_viewer', label: 'Viewer' },
        { id: 'agent_editor', label: 'Editor' },
        { id: 'agent_owner', label: 'Owner' },
      ];
    }
  }

  async function loadShareUsers() {
    if (!canUseShareTab.value) return;
    shareLoading.value = true;
    try {
      const id = editingAgent.value.id || editingAgent.value._id;
      const response = await listAgentShareUsers(id, {
        page: shareUserPage.value,
        limit: sharePageSize,
        search: shareUserSearch.value.trim(),
      });
      shareUsers.value = response.data.documents || [];
      shareUserTotal.value = response.data.total || 0;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar usuarios'), getErrorMessage(error));
    } finally {
      shareLoading.value = false;
    }
  }

  async function loadShareGroups() {
    if (!canUseShareTab.value) return;
    shareLoading.value = true;
    try {
      const id = editingAgent.value.id || editingAgent.value._id;
      const response = await listAgentShareGroups(id, {
        page: shareGroupPage.value,
        limit: sharePageSize,
        search: shareGroupSearch.value.trim(),
      });
      shareGroups.value = response.data.documents || [];
      shareGroupTotal.value = response.data.total || 0;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar grupos'), getErrorMessage(error));
    } finally {
      shareLoading.value = false;
    }
  }

  async function loadShareLists() {
    if (sharePrincipalTab.value === 'groups') {
      await loadShareGroups();
    } else {
      await loadShareUsers();
    }
  }

  function applyShareUserSearch() {
    shareUserPage.value = 1;
    return loadShareUsers();
  }

  function applyShareGroupSearch() {
    shareGroupPage.value = 1;
    return loadShareGroups();
  }

  async function changeShareRole(principalType, principal, accessRoleId) {
    if (!canUseShareTab.value) return;
    const principalId = String(principal._id);
    shareSavingId.value = `${principalType}:${principalId}`;
    try {
      const id = editingAgent.value.id || editingAgent.value._id;
      await setAgentSharePermission(id, {
        principalType,
        principalId,
        accessRoleId: accessRoleId || null,
      });
      if (principalType === 'user') {
        const row = shareUsers.value.find((item) => String(item._id) === principalId);
        if (row) row.accessRoleId = accessRoleId || null;
      } else {
        const row = shareGroups.value.find((item) => String(item._id) === principalId);
        if (row) row.accessRoleId = accessRoleId || null;
      }
      showSuccess('Permiso actualizado', 'El acceso al agente se actualizó.');
    } catch (error) {
      showError(getErrorTitle(error, 'Error al actualizar permiso'), getErrorMessage(error));
      await loadShareLists();
    } finally {
      shareSavingId.value = '';
    }
  }

  function nextShareUserPage() {
    if (shareUserPage.value >= shareUserTotalPages.value) return;
    shareUserPage.value += 1;
    return loadShareUsers();
  }

  function prevShareUserPage() {
    if (shareUserPage.value <= 1) return;
    shareUserPage.value -= 1;
    return loadShareUsers();
  }

  function nextShareGroupPage() {
    if (shareGroupPage.value >= shareGroupTotalPages.value) return;
    shareGroupPage.value += 1;
    return loadShareGroups();
  }

  function prevShareGroupPage() {
    if (shareGroupPage.value <= 1) return;
    shareGroupPage.value -= 1;
    return loadShareGroups();
  }

  function setSharePrincipalTab(tab) {
    sharePrincipalTab.value = tab;
    return loadShareLists();
  }

  const shareUserTotalPages = computed(() =>
    Math.max(1, Math.ceil(shareUserTotal.value / sharePageSize) || 1),
  );
  const shareGroupTotalPages = computed(() =>
    Math.max(1, Math.ceil(shareGroupTotal.value / sharePageSize) || 1),
  );

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
    formTab,
    FORM_TABS,
    canUseShareTab,
    ownerOptions,
    ownerSearch,
    ownerLoading,
    shareRoles,
    sharePrincipalTab,
    shareUsers,
    shareGroups,
    shareLoading,
    shareSavingId,
    shareUserSearch,
    shareGroupSearch,
    shareUserPage,
    shareGroupPage,
    shareUserTotal,
    shareGroupTotal,
    shareUserTotalPages,
    shareGroupTotalPages,
    sharePageSize,
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
    setFormTab,
    searchOwners,
    selectOwner,
    clearOwner,
    toggleTool,
    isToolSelected,
    toggleMcpServer,
    mcpServerSelectedCount,
    saveAgent,
    removeAgent,
    loadShareLists,
    applyShareUserSearch,
    applyShareGroupSearch,
    changeShareRole,
    loadShareUsers,
    loadShareGroups,
    nextShareUserPage,
    prevShareUserPage,
    nextShareGroupPage,
    prevShareGroupPage,
    setSharePrincipalTab,
  };
}
