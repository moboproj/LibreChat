import { ref, computed } from 'vue';
import { listRoles, createRole, updateRole, deleteRole as deleteRoleRequest } from '../api/roles';

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
  const roles = ref([]);
  const loading = ref(false);
  const showCreateForm = ref(false);
  const creatingStore = ref(false);
  const editingRole = ref(null);
  const formData = ref({
    name: '',
    permissions: getDefaultPermissions(),
  });

  const hasStoreRole = computed(() => roles.value.some((role) => role.name === 'STORE'));

  function isProtectedRole(name) {
    return name === 'ADMIN' || name === 'USER' || name === 'STORE';
  }

  async function loadRoles() {
    loading.value = true;
    try {
      const response = await listRoles(100);
      roles.value = response.data.documents || [];
    } catch (error) {
      console.error('Error loading roles:', error);
      alert('Error cargando roles: ' + error.message);
    } finally {
      loading.value = false;
    }
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
      await loadRoles();
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      alert('No se pudo crear STORE: ' + message);
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
      } else {
        await createRole(payload);
      }
      closeForm();
      await loadRoles();
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      alert('Error guardando rol: ' + message);
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
    if (!confirm('¿Eliminar rol?')) return;
    try {
      await deleteRoleRequest(id);
      alert('Rol eliminado');
      await loadRoles();
    } catch (error) {
      alert('Error eliminando rol: ' + error.message);
    }
  }

  return {
    roles,
    loading,
    showCreateForm,
    creatingStore,
    editingRole,
    formData,
    permissionMap,
    hasStoreRole,
    isProtectedRole,
    loadRoles,
    openCreateForm,
    createStoreRole,
    editRole,
    saveRole,
    closeForm,
    removeRole,
  };
}
