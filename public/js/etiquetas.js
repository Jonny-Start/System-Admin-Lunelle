let currentTags = [];
let currentProducts = [];
let selectedBulkTag = null;
let selectedProductIds = new Set();
let pressTimer;
let isLongPress = false;
let bulkStockFilter = 'all';

const colorPresets = ['#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

// -- Contrast Helper --
function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    return '#ffffff';
  }
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#0f172a' : '#ffffff';
}

// ---- Tag CRUD ----

async function fetchTags() {
  try {
    const res = await fetch('/api/tags');
    const data = await res.json();
    if (data.success) { currentTags = data.data; renderTags(); renderBulkTagSelector(); }
  } catch (e) { showToast('Error cargando etiquetas', 'error'); }
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    if (data.success) { currentProducts = data.data; renderBulkProducts(); renderTags(); }
  } catch (e) { showToast('Error cargando productos', 'error'); }
}

function renderTags() {
  const container = document.getElementById('tagsGrid');
  container.innerHTML = '';

  if (currentTags.length === 0) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center text-center py-20 px-4">
        <div class="w-24 h-24 bg-slate-800/60 rounded-3xl flex items-center justify-center mb-6 border border-slate-700/50 shadow-xl rotate-3">
          <i class="ph-duotone ph-bookmark-simple text-5xl text-indigo-400/60"></i>
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Sin etiquetas aún</h3>
        <p class="text-sm text-slate-400 max-w-xs mb-8 leading-relaxed">Crea etiquetas con colores para clasificar visualmente tus productos.</p>
        <button onclick="openCreateTagModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-8 py-3.5 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 font-semibold text-sm">
          <i class="ph-bold ph-plus"></i> Crear Primera Etiqueta
        </button>
      </div>`;
    return;
  }

  // Stats header
  container.insertAdjacentHTML('beforeend', `
    <div class="col-span-full glass-card rounded-2xl p-4 flex items-center justify-between mb-2 border border-slate-700/30">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <i class="ph-fill ph-bookmark-simple text-indigo-400 text-lg"></i>
        </div>
        <div>
          <p class="text-white font-bold text-sm">${currentTags.length} ${currentTags.length === 1 ? 'etiqueta' : 'etiquetas'}</p>
          <p class="text-slate-500 text-[11px]">creadas en tu cuenta</p>
        </div>
      </div>
    </div>
  `);

  currentTags.forEach(tag => {
    const usedCount = currentProducts.filter(p => p.tag && (p.tag._id === tag._id || p.tag === tag._id)).length;
    const safeName = tag.name.replace(/'/g, "\\'");
    
    container.insertAdjacentHTML('beforeend', `
      <div class="glass-card rounded-2xl p-5 flex items-center justify-between card-hover border border-slate-700/30 group cursor-pointer select-none" style="border-left: 3px solid ${tag.color};"
        onmousedown="startPress(event, '${tag._id}', '${safeName}')"
        onmouseup="endPress()"
        onmouseleave="endPress()"
        ontouchstart="startPress(event, '${tag._id}', '${safeName}')"
        ontouchend="endPress()"
        onclick="handleTagCardClick(event, '${tag._id}', '${safeName}')">
        <div class="flex items-center gap-4 min-w-0 pointer-events-none">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110" style="background: ${tag.color}20; color: ${tag.color};">
            <i class="ph-fill ph-bookmark-simple"></i>
          </div>
          <div class="min-w-0">
            <h3 class="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">${tag.name}</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">${usedCount} ${usedCount === 1 ? 'producto' : 'productos'}</p>
          </div>
        </div>
        <button onclick="event.stopPropagation(); deleteTag('${tag._id}')" class="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0 relative z-10" title="Eliminar">
          <i class="ph ph-trash text-base pointer-events-none"></i>
        </button>
      </div>
    `);
  });
}

function startPress(e, id, name) {
  isLongPress = false;
  pressTimer = setTimeout(() => {
    isLongPress = true;
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    openTagOptions(id, name);
  }, 600);
}

function endPress() {
  clearTimeout(pressTimer);
}

function handleTagCardClick(e, id, name) {
  if (isLongPress) return;
  const tag = currentTags.find(t => t._id === id);
  if (tag) openCreateTagModal(tag);
}

function openTagOptions(id, name) {
  const modal = document.getElementById('tagOptionsModal');
  const content = document.getElementById('tagOptionsContent');
  
  document.getElementById('tagOptionsTitle').innerHTML = `Opciones: <span class="text-indigo-400 text-base font-normal ml-1">${name}</span>`;
  
  document.getElementById('btnEditTag').onclick = () => {
    closeTagOptions();
    const tag = currentTags.find(t => t._id === id);
    if (tag) setTimeout(() => openCreateTagModal(tag), 300);
  };
  
  document.getElementById('btnViewTagProducts').onclick = () => {
    window.location.href = `/productos?tag=${id}`;
  };
  
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeTagOptions() {
  const content = document.getElementById('tagOptionsContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('tagOptionsModal').classList.add('hidden'), 300);
}

// ---- Create/Edit Tag Modal ----

function openCreateTagModal(tag = null) {
  const modal = document.getElementById('createTagModal');
  const content = document.getElementById('createTagModalContent');
  document.getElementById('tagForm').reset();
  document.getElementById('editTagId').value = '';
  document.getElementById('tagColorInput').value = '#6366f1';
  updateTagPreview();
  renderColorPresets();

  if (tag) {
    document.getElementById('tagModalTitle').innerHTML = '<i class="ph-fill ph-pencil-simple text-indigo-400"></i> Editar Etiqueta';
    document.getElementById('editTagId').value = tag._id;
    document.getElementById('tagNameInput').value = tag.name;
    document.getElementById('tagColorInput').value = tag.color;
    updateTagPreview();
  } else {
    document.getElementById('tagModalTitle').innerHTML = '<i class="ph-fill ph-bookmark-simple text-indigo-400"></i> Nueva Etiqueta';
  }

  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeCreateTagModal() {
  const content = document.getElementById('createTagModalContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('createTagModal').classList.add('hidden'), 300);
}

function renderColorPresets() {
  const container = document.getElementById('colorPresets');
  container.innerHTML = colorPresets.map(c => `
    <button type="button" onclick="document.getElementById('tagColorInput').value='${c}'; updateTagPreview();" class="w-7 h-7 rounded-lg border-2 border-transparent hover:border-white/50 transition-all hover:scale-110 shadow-sm" style="background-color: ${c};" title="${c}"></button>
  `).join('');
}

function updateTagPreview() {
  const name = document.getElementById('tagNameInput').value || 'Etiqueta';
  const color = document.getElementById('tagColorInput').value;
  const chip = document.getElementById('tagPreviewChip');
  chip.style.backgroundColor = color;
  chip.style.color = getContrastColor(color);
  document.getElementById('tagPreviewLabel').textContent = name;
}

function editTag(id) {
  const tag = currentTags.find(t => t._id === id);
  if (tag) openCreateTagModal(tag);
}

async function handleTagSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editTagId').value;
  const name = document.getElementById('tagNameInput').value.trim();
  const color = document.getElementById('tagColorInput').value;
  if (!name) return showToast('Ingrese un nombre', 'error');

  const submitBtn = document.getElementById('tagSubmitBtn');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i>'; submitBtn.disabled = true;

  try {
    const isUpdate = !!id;
    const url = isUpdate ? `/api/tags/${id}` : '/api/tags';
    const method = isUpdate ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
    const data = await res.json();
    if (data.success) {
      showToast(isUpdate ? 'Etiqueta actualizada' : 'Etiqueta creada exitosamente');
      closeCreateTagModal();
      fetchTags();
    } else {
      showToast(data.error || 'Error al guardar', 'error');
    }
  } catch (error) { showToast('Error de conexión', 'error'); }
  finally { submitBtn.innerHTML = originalHtml; submitBtn.disabled = false; }
}

async function deleteTag(id) {
  if (!confirm('¿Estás seguro de eliminar esta etiqueta? Se quitará de todos los productos que la tengan asignada.')) return;
  try {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success || res.ok) { showToast('Etiqueta eliminada'); fetchTags(); fetchProducts(); }
    else showToast(data.error || 'Error al eliminar', 'error');
  } catch (error) { showToast('Error de conexión', 'error'); }
}

// ---- Bulk Assignment ----

function setBulkStockFilter(filter) {
  bulkStockFilter = filter;
  ['all', 'outOfStock', 'inStock'].forEach(type => {
    const el = document.getElementById(`bulkStockFilter-${type}`);
    if (!el) return;
    if (type === filter) {
      if (type === 'outOfStock') {
        el.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-rose-500/15 border border-rose-500/80 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)] flex items-center gap-1';
      } else if (type === 'inStock') {
        el.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-emerald-500/15 border border-emerald-500/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1';
      } else {
        el.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-indigo-500/15 border border-indigo-500/80 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.15)] flex items-center gap-1';
      }
    } else {
      el.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200 flex items-center gap-1';
    }
  });
  renderBulkProducts(document.getElementById('bulkSearchInput').value);
}

function renderBulkTagSelector() {
  const container = document.getElementById('bulkTagSelector');
  container.innerHTML = '';
  if (currentTags.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-500">Crea etiquetas primero para poder asignarlas</span>';
    return;
  }

  // Add "Remove tag" option
  const removeActive = selectedBulkTag === 'none';
  container.innerHTML += `
    <button onclick="selectBulkTag('none', 'Sin Etiqueta', '#64748b')" class="px-3.5 py-2 rounded-xl text-xs border transition-all flex items-center gap-1.5 font-bold ${removeActive ? 'bg-slate-500/15 border-slate-400/80 text-slate-300 shadow-[0_0_10px_rgba(100,116,139,0.15)]' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'}">
      <i class="ph ph-x-circle"></i> Quitar Etiqueta
    </button>
  `;

  currentTags.forEach(tag => {
    const isSelected = selectedBulkTag === tag._id;
    const activeStyle = isSelected
      ? `background-color: ${tag.color}20; border-color: ${tag.color}; color: ${tag.color}; font-weight: bold; box-shadow: 0 0 10px ${tag.color}20;`
      : `background-color: rgba(30, 41, 59, 0.4); border-color: rgba(51, 65, 85, 0.5); color: #94a3b8;`;
    container.innerHTML += `
      <button onclick="selectBulkTag('${tag._id}', '${tag.name}', '${tag.color}')" class="px-3.5 py-2 rounded-xl text-xs border transition-all flex items-center gap-1.5 font-bold" style="${activeStyle}">
        <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${tag.color};"></span>
        ${tag.name}
      </button>
    `;
  });
}

function selectBulkTag(id, name, color) {
  selectedBulkTag = id;
  renderBulkTagSelector();

  const preview = document.getElementById('bulkSelectedTagPreview');
  const chip = document.getElementById('bulkSelectedTagChip');
  preview.classList.remove('hidden');
  chip.style.backgroundColor = color + '20';
  chip.style.borderColor = color;
  chip.style.color = color;
  chip.innerHTML = `<span class="w-3 h-3 rounded-full" style="background-color: ${color};"></span> ${name}`;

  updateBulkBtn();
}

function renderBulkProducts(filterQuery = '') {
  const container = document.getElementById('bulkProductList');
  container.innerHTML = '';

  let products = currentProducts;
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    products = products.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
  }

  if (bulkStockFilter === 'outOfStock') {
    products = products.filter(p => p.stock === 0);
  } else if (bulkStockFilter === 'inStock') {
    products = products.filter(p => p.stock > 0);
  }

  if (products.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500 text-sm">No se encontraron productos</div>';
    return;
  }

  products.forEach(product => {
    const isSelected = selectedProductIds.has(product._id);
    const currentTagName = product.tag && product.tag.name ? product.tag.name : 'Sin etiqueta';
    const currentTagColor = product.tag && product.tag.color ? product.tag.color : '#64748b';
    const isOut = product.stock === 0;
    const stockBadge = isOut 
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400"><span class="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>Sin stock</span>`
      : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 border border-slate-700/60 text-slate-400">Stock: ${product.stock}</span>`;

    container.insertAdjacentHTML('beforeend', `
      <div onclick="toggleProductSelection('${product._id}')" class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'}">
        <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-slate-600'}">
          ${isSelected ? '<i class="ph-bold ph-check text-white text-xs"></i>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-white truncate">${product.name}</p>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold" style="color: ${currentTagColor};">
              <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${currentTagColor};"></span>
              ${currentTagName}
            </span>
            ${product.sku ? `<span class="text-[10px] text-slate-500 bg-slate-800/50 px-1 rounded">SKU: ${product.sku}</span>` : ''}
            ${stockBadge}
          </div>
        </div>
      </div>
    `);
  });
}

function toggleProductSelection(id) {
  if (selectedProductIds.has(id)) selectedProductIds.delete(id);
  else selectedProductIds.add(id);
  renderBulkProducts(document.getElementById('bulkSearchInput').value);
  updateSelectedCount();
  updateBulkBtn();
}

function toggleSelectAll() {
  const q = document.getElementById('bulkSearchInput').value.toLowerCase();
  let visibleProducts = currentProducts;
  if (q) visibleProducts = visibleProducts.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));

  if (bulkStockFilter === 'outOfStock') {
    visibleProducts = visibleProducts.filter(p => p.stock === 0);
  } else if (bulkStockFilter === 'inStock') {
    visibleProducts = visibleProducts.filter(p => p.stock > 0);
  }

  const allSelected = visibleProducts.every(p => selectedProductIds.has(p._id));
  if (allSelected) {
    visibleProducts.forEach(p => selectedProductIds.delete(p._id));
  } else {
    visibleProducts.forEach(p => selectedProductIds.add(p._id));
  }
  renderBulkProducts(document.getElementById('bulkSearchInput').value);
  updateSelectedCount();
  updateBulkBtn();
}

function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = `${selectedProductIds.size} seleccionado${selectedProductIds.size !== 1 ? 's' : ''}`;
}

function updateBulkBtn() {
  const btn = document.getElementById('applyBulkBtn');
  btn.disabled = !selectedBulkTag || selectedProductIds.size === 0;
}

async function applyBulkTag() {
  if (!selectedBulkTag || selectedProductIds.size === 0) return;

  const btn = document.getElementById('applyBulkBtn');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Aplicando...';
  btn.disabled = true;

  try {
    const tagId = selectedBulkTag === 'none' ? null : selectedBulkTag;
    const res = await fetch('/api/tags/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, productIds: Array.from(selectedProductIds) })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Etiqueta ${tagId ? 'asignada' : 'removida'} a ${selectedProductIds.size} producto${selectedProductIds.size !== 1 ? 's' : ''}`);
      selectedProductIds.clear();
      selectedBulkTag = null;
      document.getElementById('bulkSelectedTagPreview').classList.add('hidden');
      fetchProducts();
      renderBulkTagSelector();
      updateSelectedCount();
      updateBulkBtn();
    } else {
      showToast(data.error || 'Error al asignar', 'error');
    }
  } catch (error) {
    showToast('Error de conexión', 'error');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  fetchTags();
  fetchProducts();

  document.getElementById('tagForm').addEventListener('submit', handleTagSubmit);

  document.getElementById('tagNameInput').addEventListener('input', updateTagPreview);
  document.getElementById('tagColorInput').addEventListener('input', updateTagPreview);

  document.getElementById('bulkSearchInput').addEventListener('input', (e) => {
    renderBulkProducts(e.target.value);
  });
});
