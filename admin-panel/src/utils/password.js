export function generatePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export function getPasswordStrength(password) {
  let strength = 0;

  if (!password) return { level: 'empty', percentage: 0, text: 'Vacío' };
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) strength++;

  let level = 'weak';
  let text = 'Débil';
  let percentage = (strength / 7) * 100;

  if (strength >= 6) {
    level = 'strong';
    text = 'Fuerte';
    percentage = 100;
  } else if (strength >= 4) {
    level = 'medium';
    text = 'Media';
    percentage = 66;
  } else if (strength >= 2) {
    level = 'fair';
    text = 'Aceptable';
    percentage = 33;
  }

  return { level, percentage, text };
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES');
}
