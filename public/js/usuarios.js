let usersList = [];
let currentUserId = null; // ID of the currently logged-in user, we'll extract it from jwt or just from the first fetch since we might not have it explicitly in frontend without a /api/auth/me call, but let's fetch /api/auth/me first.

const tableLoading = document.getElementById('tableLoading');
const usersTableBody = document.getElementById('usersTableBody');
const userModal = document.getElementById('userModal');
const userModalContent = userModal.querySelector('.glass-card');
const userForm = document.getElementById('userForm');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalIcon = document.getElementById('modalIcon');
const inviteInfoText = document.getElementById('inviteInfoText');
const btnNewUser = document.getElementById('btnNewUser');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelUser = document.getElementById('btnCancelUser');
const userError = document.getElementById('userError');

// Load Data
async function initUsers() {
  tableLoading.classList.remove('hidden');
  try {
    // 1. Get current user
    const meRes = await fetch('/api/auth/me');
    const meData = await meRes.json();
    if (meData.success) {
      currentUserId = meData.data._id;
    }

    // 2. Get all users
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      usersList = data.data;
      renderUsers();
    }
  } catch (error) {
    showToast('Error de conexión', 'error');
  } finally {
    tableLoading.classList.add('hidden');
  }
}

function renderUsers() {
  usersTableBody.innerHTML = '';
  
  usersList.forEach(u => {
    const isMe = u._id === currentUserId;
    const isSuperAdminUser = u.role === 'Super Admin';
    const iAmSuperAdmin = window.userRole === 'Super Admin';
    const initial = u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase();
    
    // Status badges
    let statusBadge = '';
    if (u.isActive) {
      // If it doesn't have googleId yet, it might be just invited. But let's check googleId if available, or just consider it active if isActive=true.
      const isPending = !u.googleId;
      if (isPending) {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 uppercase tracking-wider">
          <i class="ph-fill ph-clock"></i> Pendiente
        </span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 uppercase tracking-wider">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Activo
        </span>`;
      }
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 uppercase tracking-wider">
        <i class="ph-fill ph-x-circle"></i> Inactivo
      </span>`;
    }

    // Role badge
    let roleColor = 'text-slate-300';
    let roleIconColor = 'text-slate-400';
    if (u.role === 'Super Admin') { roleColor = 'text-indigo-300'; roleIconColor = 'text-indigo-400'; }
    if (u.role === 'Administrador') { roleColor = 'text-cyan-300'; roleIconColor = 'text-cyan-400'; }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/30 transition-colors group';
    tr.innerHTML = `
      <td class="p-5">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            ${initial}
          </div>
          <div>
            <p class="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">${u.name || u.email.split('@')[0]}</p>
            <p class="text-xs text-slate-500">${u.email} ${isMe ? '<span class="text-indigo-400 font-medium ml-1">(Tú)</span>' : ''}</p>
          </div>
        </div>
      </td>
      <td class="p-5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 ${roleColor} border border-slate-700/50">
          <i class="ph-fill ph-shield-check ${roleIconColor}"></i> ${u.role}
        </span>
      </td>
      <td class="p-5">
        ${statusBadge}
      </td>
      <td class="p-5 text-right space-x-2">
        ${(!isSuperAdminUser || iAmSuperAdmin) ? `
          <button onclick="editUser('${u._id}')" class="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all" title="Editar">
            <i class="ph ph-pencil-simple text-lg"></i>
          </button>
        ` : ''}
        ${!isMe && (!isSuperAdminUser || iAmSuperAdmin) ? `
          ${u.isActive ? `
          <button onclick="toggleUserStatus('${u._id}', false)" class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all" title="Desactivar">
            <i class="ph ph-trash text-lg"></i>
          </button>
          ` : `
          <button onclick="toggleUserStatus('${u._id}', true)" class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all" title="Activar / Re-invitar">
            <i class="ph ph-arrows-clockwise text-lg"></i>
          </button>
          `}
        ` : ''}
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// Modal logic
function openModal(mode, user = null) {
  userError.classList.add('hidden');
  userForm.reset();
  
  if (mode === 'create') {
    modalTitle.textContent = 'Invitar Usuario';
    modalSubtitle.textContent = 'Agrega un nuevo colaborador';
    modalIcon.className = 'ph ph-user-plus text-xl';
    document.getElementById('userId').value = '';
    document.getElementById('userEmail').disabled = false;
    document.getElementById('nameContainer').classList.add('hidden');
    inviteInfoText.classList.remove('hidden');
    document.getElementById('optSuperAdmin').classList.add('hidden');
    
    // Set default role
    document.getElementById('userRole').value = 'Empleado';
  } else {
    modalTitle.textContent = 'Editar Usuario';
    modalSubtitle.textContent = 'Modifica los accesos del usuario';
    modalIcon.className = 'ph ph-pencil-simple text-xl';
    document.getElementById('userId').value = user._id;
    
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userEmail').disabled = true; // Email is not editable
    
    document.getElementById('nameContainer').classList.remove('hidden');
    document.getElementById('userName').value = user.name;
    
    inviteInfoText.classList.add('hidden');
    
    // Manage roles
    const isMe = user._id === currentUserId;
    const roleSelect = document.getElementById('userRole');
    
    if (user.role === 'Super Admin') {
      document.getElementById('optSuperAdmin').classList.remove('hidden');
    } else {
      document.getElementById('optSuperAdmin').classList.add('hidden');
    }
    
    roleSelect.value = user.role;
    
    // If I'm editing myself, and I am Super Admin, I shouldn't be able to change my role
    // Or if I'm editing another Super Admin.
    if (user.role === 'Super Admin') {
      roleSelect.disabled = true;
    } else {
      roleSelect.disabled = false;
    }
  }

  userModal.classList.remove('opacity-0', 'pointer-events-none');
  userModalContent.classList.remove('scale-95');
}

function closeModal() {
  userModal.classList.add('opacity-0', 'pointer-events-none');
  userModalContent.classList.add('scale-95');
}

if (btnNewUser) {
  btnNewUser.addEventListener('click', () => openModal('create'));
}
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
if (btnCancelUser) btnCancelUser.addEventListener('click', closeModal);

window.editUser = (id) => {
  const user = usersList.find(u => u._id === id);
  if (user) {
    openModal('edit', user);
  }
};

window.toggleUserStatus = async (id, activate) => {
  if (id === currentUserId) {
    showToast('No puedes modificar tu propio estado', 'error');
    return;
  }

  const actionText = activate ? 'reactivar' : 'desactivar';
  const confirmMsg = activate 
    ? '¿Estás seguro de que deseas reactivar este usuario? Esto funcionará como una nueva invitación.'
    : '¿Estás seguro de que deseas desactivar este usuario?';

  if (confirm(confirmMsg)) {
    try {
      const res = await fetch(`/api/users/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: activate })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Usuario ${activate ? 'reactivado' : 'desactivado'} correctamente`, 'success');
        initUsers();
      } else {
        showToast(data.error || `Error al ${actionText} usuario`, 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  }
};

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  userError.classList.add('hidden');
  const btnSubmit = document.getElementById('btnSaveUser');
  const originalBtnContent = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> Guardando...';

  const userId = document.getElementById('userId').value;
  const isEdit = !!userId;
  
  const payload = {
    role: document.getElementById('userRole').value
  };

  if (!isEdit) {
    payload.email = document.getElementById('userEmail').value;
  } else {
    payload.name = document.getElementById('userName').value;
  }

  try {
    const url = isEdit ? `/api/users/${userId}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      showToast(isEdit ? 'Usuario actualizado' : 'Usuario invitado exitosamente', 'success');
      closeModal();
      initUsers();
    } else {
      userError.textContent = data.error || 'Error al guardar el usuario';
      userError.classList.remove('hidden');
    }
  } catch (error) {
    userError.textContent = 'Error de conexión con el servidor';
    userError.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalBtnContent;
  }
});

// Initialize
initUsers();
