import { computed, ref } from 'vue';
import {
  listUsers,
  getUserUsage,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser as deleteUserRequest,
  getSsoRoles,
  getSsoEmployee,
  linkSsoUser,
} from '../api/users';
import { listRoles } from '../api/roles';
import { fetchAuthConfig } from '../api/auth';
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

const emptyLinkForm = () => ({
  employeeNumber: '',
  roleCodigo: '',
});

export function useUsers() {
  const { showError, showSuccess, confirm } = useFeedback();
  const users = ref([]);
  const selectedIds = ref([]);
  const loading = ref(false);
  const bulkLoading = ref(false);
  const usageLoading = ref(false);
  const usersWriteEnabled = ref(false);
  const ssoLinkConfigured = ref(false);
  const showCreateForm = ref(false);
  const showLinkForm = ref(false);
  const showUsage = ref(false);
  const usageData = ref(null);
  const showPasswordField = ref(false);
  const showPassword = ref(false);
  const copyFeedback = ref('📋');
  const editingUser = ref(null);
  const availableRoles = ref(['USER', 'STORE', 'ADMIN']);
  const formData = ref(emptyForm());
  const linkForm = ref(emptyLinkForm());
  const ssoRoles = ref([]);
  const ssoEmployee = ref(null);
  const linkSearching = ref(false);
  const linkSaving = ref(false);

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadUsers(),
  });

  const allPageSelected = computed(
    () =>
      users.value.length > 0 && users.value.every((user) => selectedIds.value.includes(user._id)),
  );

  async function loadWritePolicy() {
    try {
      const response = await fetchAuthConfig();
      usersWriteEnabled.value = Boolean(response.data.usersWriteEnabled);
      ssoLinkConfigured.value = Boolean(response.data.ssoLinkConfigured);
    } catch {
      usersWriteEnabled.value = false;
      ssoLinkConfigured.value = false;
    }
  }

  async function openLinkForm() {
    showLinkForm.value = true;
    ssoEmployee.value = null;
    linkForm.value = emptyLinkForm();
    try {
      const response = await getSsoRoles();
      ssoRoles.value = response.data.roles || [];
      const defaultRole =
        ssoRoles.value.find((role) => role.is_default)?.codigo || ssoRoles.value[0]?.codigo || '';
      linkForm.value.roleCodigo = defaultRole;
      ssoLinkConfigured.value = true;
    } catch (error) {
      ssoRoles.value = [];
      showError(
        getErrorTitle(error, 'No se pudieron cargar roles SSO'),
        getErrorMessage(error) ||
          'Inicia sesión con SSO (o revisa SSO_DELEGATED_CLIENT_ID / token bootstrap)',
      );
    }
  }

  function closeLinkForm() {
    showLinkForm.value = false;
    ssoEmployee.value = null;
    linkForm.value = emptyLinkForm();
    linkSearching.value = false;
    linkSaving.value = false;
  }

  async function searchSsoEmployee() {
    const employeeNumber = linkForm.value.employeeNumber.trim();
    if (!employeeNumber) {
      showError('Número requerido', 'Indica el número de empleado.');
      return;
    }
    linkSearching.value = true;
    ssoEmployee.value = null;
    try {
      const response = await getSsoEmployee(employeeNumber);
      if (!response.data.found || !response.data.empleado) {
        showError('No encontrado', response.data.error || 'Empleado no encontrado en SSO');
        return;
      }
      if (response.data.empleado.enabled === false) {
        showError('Bloqueado', 'El empleado está bloqueado en SSO');
        return;
      }
      ssoEmployee.value = response.data.empleado;
      if (response.data.empleado.linked) {
        showSuccess('Ya vinculado', 'El empleado ya aparece vinculado al sistema en SSO.');
      }
      const existingRole = (response.data.empleado.role_codigos || []).find(
        (code) => code !== 'access' && code !== 'otp_required',
      );
      if (existingRole) {
        linkForm.value.roleCodigo = existingRole;
      }
    } catch (error) {
      showError(getErrorTitle(error, 'Error al buscar empleado'), getErrorMessage(error));
    } finally {
      linkSearching.value = false;
    }
  }

  async function submitLinkSsoUser() {
    if (!ssoEmployee.value) {
      showError('Busca primero', 'Busca el empleado en SSO antes de vincular.');
      return;
    }
    if (!linkForm.value.roleCodigo) {
      showError('Rol requerido', 'Selecciona un rol SSO.');
      return;
    }
    linkSaving.value = true;
    try {
      const response = await linkSsoUser({
        user: ssoEmployee.value.user,
        role_codigos: [linkForm.value.roleCodigo],
      });
      if (response.data.warning) {
        showSuccess('Vinculado en SSO', response.data.warning);
      } else {
        showSuccess(
          'Usuario vinculado',
          response.data.localUser?.created
            ? 'Se vinculó en SSO y se creó el usuario local.'
            : 'Se vinculó en SSO y se actualizó el usuario local.',
        );
      }
      closeLinkForm();
      await loadUsers();
    } catch (error) {
      showError(getErrorTitle(error, 'Error al vincular'), getErrorMessage(error));
    } finally {
      linkSaving.value = false;
    }
  }

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
    if (!usersWriteEnabled.value) return;
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((item) => item !== id);
      return;
    }
    selectedIds.value = [...selectedIds.value, id];
  }

  function toggleSelectPage() {
    if (!usersWriteEnabled.value) return;
    if (allPageSelected.value) {
      const pageIds = new Set(users.value.map((user) => user._id));
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id));
      return;
    }
    const merged = new Set([...selectedIds.value, ...users.value.map((user) => user._id)]);
    selectedIds.value = [...merged];
  }

  function editUser(user) {
    if (!usersWriteEnabled.value) return;
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
    if (!usersWriteEnabled.value) {
      showError('Escritura deshabilitada', 'Los usuarios se gestionan vía SSO.');
      return;
    }
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
    if (!usersWriteEnabled.value) return;
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
    if (!usersWriteEnabled.value || !selectedIds.value.length) return;
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
    usersWriteEnabled,
    ssoLinkConfigured,
    showCreateForm,
    showLinkForm,
    showUsage,
    usageData,
    showPasswordField,
    showPassword,
    copyFeedback,
    editingUser,
    availableRoles,
    formData,
    linkForm,
    ssoRoles,
    ssoEmployee,
    linkSearching,
    linkSaving,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    rangeLabel: pagination.rangeLabel,
    searchQuery: pagination.searchQuery,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    loadWritePolicy,
    loadRoles,
    loadUsers,
    toggleSelect,
    toggleSelectPage,
    editUser,
    openUsage,
    closeUsage,
    openLinkForm,
    closeLinkForm,
    searchSsoEmployee,
    submitLinkSsoUser,
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
