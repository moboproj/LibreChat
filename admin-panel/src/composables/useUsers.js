import { ref, computed } from 'vue';
import {
  listUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser as deleteUserRequest,
} from '../api/users';
import { listRoles } from '../api/roles';
import { formatDate, generatePassword, getPasswordStrength } from '../utils/password';

const emptyForm = () => ({
  email: '',
  name: '',
  password: '',
  role: 'USER',
});

export function useUsers() {
  const users = ref([]);
  const searchQuery = ref('');
  const loading = ref(false);
  const showCreateForm = ref(false);
  const showPasswordField = ref(false);
  const showPassword = ref(false);
  const copyFeedback = ref('📋');
  const editingUser = ref(null);
  const availableRoles = ref(['USER', 'STORE', 'ADMIN']);
  const formData = ref(emptyForm());

  const filteredUsers = computed(() => {
    const q = searchQuery.value.toLowerCase();
    if (!q) return users.value;
    return users.value.filter(
      (user) => user.email?.toLowerCase().includes(q) || user.name?.toLowerCase().includes(q),
    );
  });

  async function loadRoles() {
    try {
      const response = await listRoles(200);
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
      const response = await listUsers(100);
      users.value = response.data.documents || [];
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error cargando usuarios: ' + error.message);
    } finally {
      loading.value = false;
    }
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
        alert('Usuario actualizado');
      } else {
        if (!formData.value.password) {
          alert('Contraseña es requerida');
          return;
        }
        await createUser(formData.value);
        alert('Usuario creado exitosamente');
      }
      closeForm();
      await loadUsers();
    } catch (error) {
      alert('Error guardando usuario: ' + (error.response?.data?.error || error.message));
    }
  }

  async function removeUser(id) {
    if (!confirm('¿Eliminar usuario?')) return;
    try {
      await deleteUserRequest(id);
      alert('Usuario eliminado');
      await loadUsers();
    } catch (error) {
      alert('Error eliminando usuario: ' + error.message);
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
        alert('Error al copiar la contraseña');
      });
  }

  function passwordStrength() {
    return getPasswordStrength(formData.value.password);
  }

  return {
    users,
    filteredUsers,
    searchQuery,
    loading,
    showCreateForm,
    showPasswordField,
    showPassword,
    copyFeedback,
    editingUser,
    availableRoles,
    formData,
    loadRoles,
    loadUsers,
    editUser,
    closeForm,
    saveUser,
    removeUser,
    onGeneratePassword,
    togglePasswordVisibility,
    copyPasswordToClipboard,
    passwordStrength,
    formatDate,
  };
}
