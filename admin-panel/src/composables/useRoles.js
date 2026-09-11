import { ref } from 'vue';
import {
  listRoles,
  listRoleUsers,
  createRole,
  updateRole,
  deleteRole as deleteRoleRequest,
} from '../api/roles';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

function getDefaultPermissions() {
  return {
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
}

const permissionMap = {
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
};

export function useRoles() {
  const { showError, showSuccess, confirm } = useFeedback();
  const roles = ref([]);
  const loading = ref(false);
  const usersLoading = ref(false);
  const showCreateForm = ref(false);
  const showUsers = ref(false);
  const roleUsers = ref([]);
  const selectedRole = ref(null);
  const creatingStore = ref(false);
  const hasStoreRole = ref(false);
  const editingRole = ref(null);
  const formData = ref({
    name: '',
    permissions: getDefaultPermissions(),
  });

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadRoles(),
  });

  function isProtectedRole(name) {
    return name === 'ADMIN' || name === 'USER' || name === 'STORE';
  }

  async function loadRoles() {
    loading.value = true;
    try {
      const response = await listRoles({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
      });
      roles.value = response.data.documents || [];
      hasStoreRole.value = Boolean(response.data.hasStore);
      pagination.applyMeta(response.data);
    } catch (error) {
      console.error('Error loading roles:', error);
      showError(getErrorTitle(error, 'Error al cargar roles'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function openRoleUsers(role) {
    selectedRole.value = role;
    showUsers.value = true;
    usersLoading.value = true;
    roleUsers.value = [];
    try {
      const response = await listRoleUsers(role._id, { page: 1, limit: 50 });
      roleUsers.value = response.data.documents || [];
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar usuarios del rol'), getErrorMessage(error));
      showUsers.value = false;
    } finally {
      usersLoading.value = false;
    }
  }

  function closeRoleUsers() {
    showUsers.value = false;
    selectedRole.value = null;
    roleUsers.value = [];
  }

  function openCreateForm() {
    editingRole.value = null;
    formData.value = {
      name: '',
      permissions: getDefaultPermissions(),
    };
    showCreateForm.value = true;
  }

  async function createStoreRole() {
    creatingStore.value = true;
    try {
      await createRole({ name: 'STORE' });
      showSuccess('Rol STORE', 'El rol STORE se creó correctamente.');
      await loadRoles();
    } catch (error) {
      showError(getErrorTitle(error, 'No se pudo crear STORE'), getErrorMessage(error));
    } finally {
      creatingStore.value = false;
    }
  }

  function editRole(role) {
    editingRole.value = role;
    const base = getDefaultPermissions();
    const merged = { ...base };
    if (role.permissions) {
      for (const type in role.permissions) {
        merged[type] = { ...base[type], ...role.permissions[type] };
      }
    }
    formData.value = {
      name: role.name,
      permissions: merged,
    };
    showCreateForm.value = true;
  }

  async function saveRole() {
    try {
      const payload = {
        name: formData.value.name.trim(),
        permissions: formData.value.permissions,
      };
      if (editingRole.value) {
        await updateRole(editingRole.value._id, payload);
        showSuccess('Rol actualizado', 'Los permisos se guardaron correctamente.');
      } else {
        await createRole(payload);
        showSuccess('Rol creado', 'El rol se creó correctamente.');
      }
      closeForm();
      await loadRoles();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al guardar rol'), getErrorMessage(error));
    }
  }

  function closeForm() {
    showCreateForm.value = false;
    editingRole.value = null;
    formData.value = {
      name: '',
      permissions: getDefaultPermissions(),
    };
  }

  async function removeRole(id) {
    const ok = await confirm('Eliminar rol', '¿Seguro que deseas eliminar este rol?', {
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await deleteRoleRequest(id);
      showSuccess('Rol eliminado', 'El rol se eliminó correctamente.');
      await loadRoles();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al eliminar rol'), getErrorMessage(error));
    }
  }

  return {
    roles,
    loading,
    usersLoading,
    showCreateForm,
    showUsers,
    roleUsers,
    selectedRole,
    creatingStore,
    editingRole,
    formData,
    permissionMap,
    hasStoreRole,
    isProtectedRole,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    rangeLabel: pagination.rangeLabel,
    searchQuery: pagination.searchQuery,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    loadRoles,
    openRoleUsers,
    closeRoleUsers,
    openCreateForm,
    createStoreRole,
    editRole,
    saveRole,
    closeForm,
    removeRole,
  };
}
