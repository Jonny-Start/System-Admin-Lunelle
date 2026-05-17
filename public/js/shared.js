// Shared utilities: toast, logout, currency formatting
// These are available on every page.

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400';
  const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
  
  toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-2xl border ${bg} backdrop-blur-xl shadow-2xl mx-auto w-full`;
  toast.innerHTML = `<i class="ph-fill ${icon} text-xl"></i><span class="font-semibold text-sm">${message}</span>`;
  
  document.getElementById('toastContainer').appendChild(toast);
  
  setTimeout(() => {
    toast.classList.replace('toast-enter', 'toast-leave');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function logout() {
  try {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  } catch (error) {
    showToast('Error al cerrar sesión', 'error');
  }
}

function formatCurrency(input) {
  let val = input.value.replace(/\D/g, '');
  if(val !== '') {
    val = parseInt(val, 10);
    input.value = val.toLocaleString('es-CO');
  } else {
    input.value = '';
  }
}

function getRawValue(input) {
  const val = input.value ? input.value.toString().replace(/\D/g, '') : '';
  return val === '' ? 0 : parseInt(val, 10);
}

function preventNegative(input) {
  if (input.value < 0) input.value = Math.abs(input.value);
}
