export function getErrorMessage(error, fallback = 'Error inesperado') {
  const data = error?.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

export function getErrorTitle(error, fallback = 'Error') {
  const status = error?.response?.status;
  if (!status) return fallback;
  if (status >= 500) return `Error del servidor (${status})`;
  if (status === 404) return 'No encontrado';
  if (status === 403) return 'Sin permiso';
  if (status === 401) return 'No autorizado';
  if (status === 400 || status === 409) return 'Solicitud inválida';
  return `${fallback} (${status})`;
}
