import { computed, ref } from 'vue';
import {
  listUsers,
  getUserUsage,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser as deleteUserRequest,
} from '../api/users';
import { listRoles } from '../api/roles';
import { formatDate, generatePassword, getPasswordStrength } from '../utils/password';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { downloadCsv, toCsv } from '../utils/csv';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

const emptyForm = () => ({
  email: '',
  name: '',
  password: '',
  role: 'USER',
});

export function useUsers() {
  const { showError, showSuccess, confirm } = useFeedback();
  const users = ref([]);
  const selectedIds = ref([]);
  const loading = ref(false);
  const bulkLoading = ref(false);
  const usageLoading = ref(false);
  const showCreateForm = ref(false);
  const showUsage = ref(false);
  const usageData = ref(null);
  const showPasswordField = ref(false);
  const showPassword = ref(false);
  const copyFeedback = ref('📋');
  const editingUser = ref(null);
  const availableRoles = ref(['USER', 'STORE', 'ADMIN']);
  const formData = ref(emptyForm());

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadUsers(),
  });

  const allPageSelected = computed(
    () =>
      users.value.length > 0 && users.value.every((user) => selectedIds.value.includes(user._id)),
  );

  async function loadRoles() {
    try {
      const response = await listRoles({ page: 1, limit: 100 });
      const names = (response.data.documents || []).map((role) => role.name).filter(Boolean);
      if (names.length) {
        availableRoles.value = names;
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async function loadUsers() {
    loading.value = true;
    try {
      const response = await listUsers({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
      });
      users.value = response.data.documents || [];
      pagination.applyMeta(response.data);
      selectedIds.value = selectedIds.value.filter((id) =>
        users.value.some((user) => user._id === id),
      );
    } catch (error) {
      console.error('Error loading users:', error);
      showError(getErrorTitle(error, 'Error al cargar usuarios'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  function toggleSelect(id) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((item) => item !== id);
      return;
    }
    selectedIds.value = [...selectedIds.value, id];
  }

  function toggleSelectPage() {
    if (allPageSelected.value) {
      const pageIds = new Set(users.value.map((user) => user._id));
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id));
      return;
    }
    const merged = new Set([...selectedIds.value, ...users.value.map((user) => user._id)]);
    selectedIds.value = [...merged];
  }

  function editUser(user) {
    editingUser.value = user;
    showPasswordField.value = false;
    formData.value = {
      email: user.email,
      name: user.name || '',
      password: '',
      role: user.role || 'USER',
    };
    showCreateForm.value = true;
  }

  async function openUsage(user) {
    showUsage.value = true;
    usageLoading.value = true;
    usageData.value = null;
    try {
      const response = await getUserUsage(user._id, { range: '30d' });
      usageData.value = response.data;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar uso'), getErrorMessage(error));
      showUsage.value = false;
    } finally {
      usageLoading.value = false;
    }
  }

  function closeUsage() {
    showUsage.value = false;
    usageData.value = null;
  }

  function closeForm() {
    showCreateForm.value = false;
    showPasswordField.value = false;
    editingUser.value = null;
    formData.value = emptyForm();
  }

  async function saveUser() {
    try {
      if (editingUser.value) {
        await updateUser(editingUser.value._id, {
          email: formData.value.email,
          name: formData.value.name,
          role: formData.value.role,
        });
        if (formData.value.password) {
          await updateUserPassword(editingUser.value._id, formData.value.password);
        }
        showSuccess('Usuario actualizado', 'Los cambios se guardaron correctamente.');
      } else {
        if (!formData.value.password) {
          showError('Contraseña requerida', 'Debes indicar una contraseña para el nuevo usuario.');
          return;
        }
        await createUser(formData.value);
        showSuccess('Usuario creado', 'La cuenta se creó exitosamente.');
      }
      closeForm();
      await loadUsers();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al guardar usuario'), getErrorMessage(error));
    }
  }

  async function removeUser(id) {
    const ok = await confirm('Eliminar usuario', '¿Seguro que deseas eliminar este usuario?', {
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await deleteUserRequest(id);
      showSuccess('Usuario eliminado', 'El usuario se eliminó correctamente.');
      await loadUsers();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al eliminar usuario'), getErrorMessage(error));
    }
  }

  async function removeSelected() {
    if (!selectedIds.value.length) return;
    const ok = await confirm(
      'Eliminar seleccionados',
      `¿Eliminar ${selectedIds.value.length} usuario(s)?`,
      { confirmLabel: 'Eliminar' },
    );
    if (!ok) return;
    bulkLoading.value = true;
    try {
      const results = await Promise.allSettled(
        selectedIds.value.map((id) => deleteUserRequest(id)),
      );
      const failed = results.filter((result) => result.status === 'rejected').length;
      selectedIds.value = [];
      await loadUsers();
      if (failed) {
        showError('Eliminación parcial', `${failed} usuario(s) no se pudieron eliminar.`);
      } else {
        showSuccess('Usuarios eliminados', 'La selección se eliminó correctamente.');
      }
    } finally {
      bulkLoading.value = false;
    }
  }

  async function exportCsv() {
    try {
      const response = await listUsers({
        page: 1,
        limit: 100,
        search: pagination.searchDebounced.value,
      });
      const rows = response.data.documents || [];
      const csv = toCsv(rows, [
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Nombre', value: (row) => row.name || '' },
        { key: 'role', label: 'Rol', value: (row) => row.role || 'USER' },
        { key: 'provider', label: 'Provider', value: (row) => row.provider || '' },
        {
          key: 'conversationCount',
          label: 'Conversaciones',
          value: (row) => row.conversationCount || 0,
        },
        { key: 'totalTokens', label: 'Tokens', value: (row) => row.totalTokens || 0 },
        { key: 'createdAt', label: 'Creado', value: (row) => formatDate(row.createdAt) },
      ]);
      downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showSuccess('Exportación lista', `Se exportaron ${rows.length} usuario(s) (máx. 100).`);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al exportar'), getErrorMessage(error));
    }
  }

  function onGeneratePassword() {
    formData.value.password = generatePassword();
    showPassword.value = true;
    copyFeedback.value = '📋';
  }

  function togglePasswordVisibility() {
    showPassword.value = !showPassword.value;
  }

  function copyPasswordToClipboard() {
    navigator.clipboard
      .writeText(formData.value.password)
      .then(() => {
        copyFeedback.value = '✅ Copiado!';
        setTimeout(() => {
          copyFeedback.value = '📋';
        }, 2000);
      })
      .catch(() => {
        showError('No se pudo copiar', 'El portapapeles no está disponible en este navegador.');
      });
  }

  function passwordStrength() {
    return getPasswordStrength(formData.value.password);
  }

  return {
    users,
    selectedIds,
    allPageSelected,
    loading,
    bulkLoading,
    usageLoading,
    showCreateForm,
    showUsage,
    usageData,
    showPasswordField,
    showPassword,
    copyFeedback,
    editingUser,
    availableRoles,
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
    loadRoles,
    loadUsers,
    toggleSelect,
    toggleSelectPage,
    editUser,
    openUsage,
    closeUsage,
    closeForm,
    saveUser,
    removeUser,
    removeSelected,
    exportCsv,
    onGeneratePassword,
    togglePasswordVisibility,
    copyPasswordToClipboard,
    passwordStrength,
    formatDate,
  };
}
