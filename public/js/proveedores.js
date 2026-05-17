let currentProviders = [];

const provColors = ['cat-accent-0','cat-accent-1','cat-accent-2','cat-accent-3','cat-accent-4','cat-accent-5','cat-accent-6','cat-accent-7'];

let isLongPress = false;
let pressTimer;

async function fetchProviders() {
  try {
    const res = await fetch('/api/providers');
    const data = await res.json();
    if (data.success) { currentProviders = data.data; renderProviders(); }
  } catch (error) { showToast('Error cargando proveedores', 'error'); }
}

function renderProviders() {
  const container = document.getElementById('providerListContainer');
  if (!container) return;
  container.innerHTML = '';
  if (currentProviders.length === 0) {
    container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-center py-20 px-4"><div class="w-24 h-24 bg-slate-800/60 rounded-3xl flex items-center justify-center mb-6 border border-slate-700/50 shadow-xl rotate-6"><i class="ph-duotone ph-truck text-5xl text-indigo-400/60"></i></div><h3 class="text-xl font-bold text-white mb-2">Sin proveedores aún</h3><p class="text-sm text-slate-400 max-w-xs mb-8 leading-relaxed">Crea proveedores para organizar tus productos de forma eficiente.</p><button onclick="openProviderModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-8 py-3.5 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 font-semibold text-sm"><i class="ph-bold ph-plus"></i> Crear Primer Proveedor</button></div>`;
    return;
  }
  container.insertAdjacentHTML('beforeend', `<div class="col-span-full glass-card rounded-2xl p-4 flex items-center justify-between mb-2 border border-slate-700/30"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><i class="ph-fill ph-squares-four text-indigo-400 text-lg"></i></div><div><p class="text-white font-bold text-sm">${currentProviders.length} ${currentProviders.length === 1 ? 'proveedor' : 'proveedores'}</p><p class="text-slate-500 text-[11px]">registrados</p></div></div></div>`);
  currentProviders.forEach((prov, i) => {
    const accent = provColors[i % provColors.length];
    const prodCount = prov.productCount || 0;
    
    const safeName = prov.name.replace(/'/g, "\\'");
    
    container.insertAdjacentHTML('beforeend', `<div class="glass-card rounded-2xl p-5 flex items-center justify-between card-hover border border-slate-700/30 group ${accent} cursor-pointer select-none" style="border-left: 3px solid var(--cat-color);" 
      onmousedown="startPress(event, '${prov._id}', '${safeName}')"
      onmouseup="endPress()"
      onmouseleave="endPress()"
      ontouchstart="startPress(event, '${prov._id}', '${safeName}')"
      ontouchend="endPress()"
      onclick="handleProviderClick(event, '${prov._id}', '${safeName}')">
      <div class="flex items-center gap-4 min-w-0 pointer-events-none">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110" style="background: var(--cat-bg); color: var(--cat-color);">
          <i class="ph-fill ph-truck"></i>
        </div>
        <div class="min-w-0">
          <h3 class="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">${prov.name}</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">${prodCount} ${prodCount === 1 ? 'producto' : 'productos'}</p>
        </div>
      </div>
      <button onclick="event.stopPropagation(); deleteProvider('${prov._id}')" class="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0 relative z-10" title="Eliminar">
        <i class="ph ph-trash text-base pointer-events-none"></i>
      </button>
    </div>`);
  });
}

function startPress(e, id, name) {
  isLongPress = false;
  pressTimer = setTimeout(() => {
    isLongPress = true;
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    openProviderOptions(id, name);
  }, 600);
}

function endPress() {
  clearTimeout(pressTimer);
}

function handleProviderClick(e, id, name) {
  if (isLongPress) return;
  openProviderModal(id, name);
}

function openProviderOptions(id, name) {
  const modal = document.getElementById('providerOptionsModal');
  const content = document.getElementById('providerOptionsContent');
  
  document.getElementById('providerOptionsTitle').innerHTML = `Opciones: <span class="text-indigo-400 text-base font-normal ml-1">${name}</span>`;
  
  document.getElementById('btnEditProvider').onclick = () => {
    closeProviderOptions();
    setTimeout(() => openProviderModal(id, name), 300);
  };
  
  document.getElementById('btnViewProducts').onclick = () => {
    window.location.href = `/productos?provider=${id}`;
  };
  
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeProviderOptions() {
  const content = document.getElementById('providerOptionsContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('providerOptionsModal').classList.add('hidden'), 300);
}

function openProviderModal(id = null, name = '') {
  const modal = document.getElementById('providerModal');
  const content = document.getElementById('providerModalContent');
  const title = document.getElementById('providerModalTitle');
  
  document.getElementById('providerForm').reset();
  
  if (id) {
    title.innerHTML = '<i class="ph-fill ph-pencil-simple text-indigo-400"></i> Editar Proveedor';
    document.getElementById('providerId').value = id;
    document.getElementById('provName').value = name;
  } else {
    title.innerHTML = '<i class="ph-fill ph-truck text-indigo-400"></i> Nuevo Proveedor';
    document.getElementById('providerId').value = '';
  }
  
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeProviderModal() {
  const content = document.getElementById('providerModalContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('providerModal').classList.add('hidden'), 300);
}

async function handleProviderSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('provName').value;
  const id = document.getElementById('providerId').value;
  const submitBtn = document.getElementById('provSubmitBtn');
  
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i>'; submitBtn.disabled = true;
  
  try {
    const url = id ? `/api/providers/${id}` : '/api/providers';
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.success) { 
      showToast(id ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente'); 
      closeProviderModal(); 
      fetchProviders(); 
    }
    else showToast(data.error || 'Error al guardar', 'error');
  } catch (error) { showToast('Error de conexión', 'error'); }
  finally { submitBtn.innerHTML = originalHtml; submitBtn.disabled = false; }
}

async function deleteProvider(id) {
  if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
  try {
    const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('Proveedor eliminado'); fetchProviders(); }
    else showToast(data.error || 'Error al eliminar', 'error');
  } catch (error) { showToast('Error de conexión', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchProviders();
  document.getElementById('providerForm').addEventListener('submit', handleProviderSubmit);
});
