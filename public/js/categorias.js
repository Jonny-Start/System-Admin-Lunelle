let currentCategories = [];

const catColors = ['cat-accent-0','cat-accent-1','cat-accent-2','cat-accent-3','cat-accent-4','cat-accent-5','cat-accent-6','cat-accent-7'];
const catIcons = ['ph-tag','ph-t-shirt','ph-sneaker','ph-cookie','ph-diamond','ph-gift','ph-flower-tulip','ph-star'];

let isLongPress = false;
let pressTimer;

async function fetchCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) { currentCategories = data.data; renderCategories(); }
  } catch (error) { showToast('Error cargando categorías', 'error'); }
}

function renderCategories() {
  const container = document.getElementById('categoryListContainer');
  if (!container) return;
  container.innerHTML = '';
  if (currentCategories.length === 0) {
    container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-center py-20 px-4"><div class="w-24 h-24 bg-slate-800/60 rounded-3xl flex items-center justify-center mb-6 border border-slate-700/50 shadow-xl rotate-6"><i class="ph-duotone ph-tags text-5xl text-indigo-400/60"></i></div><h3 class="text-xl font-bold text-white mb-2">Sin categorías aún</h3><p class="text-sm text-slate-400 max-w-xs mb-8 leading-relaxed">Crea categorías para organizar tu inventario de forma eficiente y encontrar productos rápidamente.</p><button onclick="openCategoryModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-8 py-3.5 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 font-semibold text-sm"><i class="ph-bold ph-plus"></i> Crear Primera Categoría</button></div>`;
    return;
  }
  container.insertAdjacentHTML('beforeend', `<div class="col-span-full glass-card rounded-2xl p-4 flex items-center justify-between mb-2 border border-slate-700/30"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><i class="ph-fill ph-squares-four text-indigo-400 text-lg"></i></div><div><p class="text-white font-bold text-sm">${currentCategories.length} ${currentCategories.length === 1 ? 'categoría' : 'categorías'}</p><p class="text-slate-500 text-[11px]">en tu catálogo</p></div></div></div>`);
  currentCategories.forEach((cat, i) => {
    const accent = catColors[i % catColors.length];
    const icon = catIcons[i % catIcons.length];
    const prodCount = cat.productCount || 0;
    
    // Scape quotes in name if needed
    const safeName = cat.name.replace(/'/g, "\\'");
    
    container.insertAdjacentHTML('beforeend', `<div class="glass-card rounded-2xl p-5 flex items-center justify-between card-hover border border-slate-700/30 group ${accent} cursor-pointer select-none" style="border-left: 3px solid var(--cat-color);" 
      onmousedown="startPress(event, '${cat._id}', '${safeName}')"
      onmouseup="endPress()"
      onmouseleave="endPress()"
      ontouchstart="startPress(event, '${cat._id}', '${safeName}')"
      ontouchend="endPress()"
      onclick="handleCategoryClick(event, '${cat._id}', '${safeName}')">
      <div class="flex items-center gap-4 min-w-0 pointer-events-none">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110" style="background: var(--cat-bg); color: var(--cat-color);">
          <i class="ph-fill ${icon}"></i>
        </div>
        <div class="min-w-0">
          <h3 class="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">${cat.name}</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">${prodCount} ${prodCount === 1 ? 'producto' : 'productos'}</p>
        </div>
      </div>
      <button onclick="event.stopPropagation(); deleteCategory('${cat._id}')" class="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0 relative z-10" title="Eliminar">
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
      window.navigator.vibrate(50); // Haptic feedback on mobile if supported
    }
    openCategoryOptions(id, name);
  }, 600);
}

function endPress() {
  clearTimeout(pressTimer);
}

function handleCategoryClick(e, id, name) {
  if (isLongPress) return;
  openCategoryModal(id, name);
}

function openCategoryOptions(id, name) {
  const modal = document.getElementById('categoryOptionsModal');
  const content = document.getElementById('categoryOptionsContent');
  
  document.getElementById('categoryOptionsTitle').innerHTML = `Opciones: <span class="text-indigo-400 text-base font-normal ml-1">${name}</span>`;
  
  document.getElementById('btnEditCategory').onclick = () => {
    closeCategoryOptions();
    setTimeout(() => openCategoryModal(id, name), 300);
  };
  
  document.getElementById('btnViewProducts').onclick = () => {
    window.location.href = `/productos?category=${id}`;
  };
  
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeCategoryOptions() {
  const content = document.getElementById('categoryOptionsContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('categoryOptionsModal').classList.add('hidden'), 300);
}

function openCategoryModal(id = null, name = '') {
  const modal = document.getElementById('categoryModal');
  const content = document.getElementById('categoryModalContent');
  const title = document.getElementById('categoryModalTitle');
  
  document.getElementById('categoryForm').reset();
  
  if (id) {
    title.innerHTML = '<i class="ph-fill ph-pencil-simple text-indigo-400"></i> Editar Categoría';
    document.getElementById('categoryId').value = id;
    document.getElementById('catName').value = name;
  } else {
    title.innerHTML = '<i class="ph-fill ph-tag text-indigo-400"></i> Nueva Categoría';
    document.getElementById('categoryId').value = '';
  }
  
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeCategoryModal() {
  const content = document.getElementById('categoryModalContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('categoryModal').classList.add('hidden'), 300);
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('catName').value;
  const id = document.getElementById('categoryId').value;
  const submitBtn = document.getElementById('catSubmitBtn');
  
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i>'; submitBtn.disabled = true;
  
  try {
    const url = id ? `/api/categories/${id}` : '/api/categories';
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.success) { 
      showToast(id ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente'); 
      closeCategoryModal(); 
      fetchCategories(); 
    }
    else showToast(data.error || 'Error al guardar', 'error');
  } catch (error) { showToast('Error de conexión', 'error'); }
  finally { submitBtn.innerHTML = originalHtml; submitBtn.disabled = false; }
}

async function deleteCategory(id) {
  if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
  try {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('Categoría eliminada'); fetchCategories(); }
    else showToast(data.error || 'Error al eliminar', 'error');
  } catch (error) { showToast('Error de conexión', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();
  document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
});
