const userRole = window.userRole;
let currentProducts = [];
let currentCategories = [];
let currentProviders = [];
let currentTags = [];
let productColors = [];

// -- Color Management --
function addColorRow(color = null) {
  const entry = color || { name: '', hex: '#6366f1', stock: 0 };
  productColors.push({ ...entry });
  renderColorRows();
}

function removeColorRow(idx) {
  productColors.splice(idx, 1);
  renderColorRows();
}

function updateColorField(idx, field, value) {
  if (field === 'stock') {
    productColors[idx].stock = Math.max(0, parseInt(value, 10) || 0);
  } else {
    productColors[idx][field] = value;
  }
  updateColorsTotal();
}

function renderColorRows() {
  const container = document.getElementById('colorsContainer');
  const emptyState = document.getElementById('colorsEmptyState');
  const totalBar = document.getElementById('colorsTotalStock');
  const stockWrapper = document.getElementById('stockFieldWrapper');
  const stockInput = document.getElementById('stock');

  if (productColors.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    totalBar.classList.add('hidden');
    stockWrapper.classList.remove('hidden');
    stockInput.required = true;
    return;
  }

  emptyState.classList.add('hidden');
  totalBar.classList.remove('hidden');
  stockWrapper.classList.add('hidden');
  stockInput.required = false;

  container.innerHTML = productColors.map((c, i) => `
    <div class="flex items-center gap-2 bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/30 group" style="animation: cardSlideUp 0.15s ease-out both">
      <input type="color" value="${c.hex}" onchange="updateColorField(${i}, 'hex', this.value)" class="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0 shrink-0" title="Seleccionar color">
      <div class="flex-1 min-w-0">
        <input type="text" value="${c.name}" onchange="updateColorField(${i}, 'name', this.value)" placeholder="Nombre (Ej: Rojo)" class="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all">
      </div>
      <div class="w-20 shrink-0">
        <input type="number" value="${c.stock}" min="0" onchange="updateColorField(${i}, 'stock', this.value)" placeholder="Stock" class="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all text-center" oninput="preventNegative(this)">
      </div>
      <button type="button" onclick="removeColorRow(${i})" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0" title="Eliminar color">
        <i class="ph ph-x text-sm"></i>
      </button>
    </div>
  `).join('');

  updateColorsTotal();
}

function updateColorsTotal() {
  const total = productColors.reduce((sum, c) => sum + (c.stock || 0), 0);
  const totalEl = document.getElementById('colorsTotalStockValue');
  if (totalEl) totalEl.textContent = total;
  // Update hidden stock field
  if (productColors.length > 0) {
    document.getElementById('stock').value = total;
  }
  // Update hidden colors JSON
  document.getElementById('productColors').value = JSON.stringify(productColors);
}

function getColorsDotsHtml(product) {
  if (!product.colors || product.colors.length === 0) return '';
  const dots = product.colors.map(c => {
    const border = c.stock === 0 ? 'border-red-500/50 opacity-40' : 'border-white/20';
    return `<span class="w-3.5 h-3.5 rounded-full shrink-0 border ${border} shadow-sm" style="background-color: ${c.hex};" title="${c.name}: ${c.stock} disp"></span>`;
  }).join('');
  return `<div class="flex items-center gap-1 mt-1.5 flex-wrap">${dots}</div>`;
}

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

// -- Price Calculations --
function calculatePriceFromMargin() {
  const cost = getRawValue(document.getElementById('purchasePrice'));
  const margin = parseFloat(document.getElementById('profitMargin').value) || 0;
  if(cost > 0 && margin >= 0) {
    const sale = cost + (cost * (margin / 100));
    document.getElementById('salePrice').value = Math.round(sale).toLocaleString('es-CO');
  }
}

function calculateMarginFromPrice() {
  const cost = getRawValue(document.getElementById('purchasePrice'));
  const sale = getRawValue(document.getElementById('salePrice'));
  if(cost > 0 && sale >= cost) {
    document.getElementById('profitMargin').value = Math.round(((sale - cost) / cost) * 100);
  } else {
    document.getElementById('profitMargin').value = '';
  }
}

// -- Tag Functions --
async function fetchTags() {
  try {
    const res = await fetch('/api/tags');
    const data = await res.json();
    if(data.success) currentTags = data.data;
  } catch(e) { console.error('Error fetching tags', e); }
}

function openTagModal() {
  const modal = document.getElementById('tagModal');
  const content = document.getElementById('tagModalContent');
  renderTagsInSelector();
  modal.classList.remove('hidden');
  setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100'); }, 10);
}

function closeTagModal() {
  const modal = document.getElementById('tagModal');
  const content = document.getElementById('tagModalContent');
  content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

let selectedTagIds = [];

function renderTagsInSelector() {
  const container = document.getElementById('tagListContainer');
  container.innerHTML = '';
  if(currentTags.length === 0) { container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No hay etiquetas creadas.</p>'; return; }
  
  container.innerHTML += `<div onclick="toggleTagSelectionInModal(null)" class="px-4 py-2 rounded-xl hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors border border-transparent hover:border-slate-700"><div class="flex items-center gap-3"><div class="w-4 h-4 rounded-full border-2 border-slate-600"></div><span class="text-sm font-medium text-slate-400">Limpiar Selección</span></div></div>`;
  currentTags.forEach(tag => {
    const isSelected = selectedTagIds.includes(tag._id);
    const checkIcon = isSelected ? `<i class="ph-bold ph-check text-indigo-400 text-sm"></i>` : `<div class="w-4 h-4 rounded-full border border-slate-600"></div>`;
    container.innerHTML += `<div onclick="toggleTagSelectionInModal('${tag._id}')" class="px-4 py-2 rounded-xl hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors border ${isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-transparent hover:border-slate-700'} group"><div class="flex items-center gap-3"><div class="w-4 h-4 rounded-full" style="background-color: ${tag.color}; border: 1px solid rgba(255,255,255,0.1);"></div><span class="text-sm font-medium text-white">${tag.name}</span></div><div>${checkIcon}</div></div>`;
  });
}

function toggleTagSelectionInModal(tagId) {
  if (tagId === null) {
    selectedTagIds = [];
    updateSelectedTagsUI();
    closeTagModal();
    return;
  }
  const index = selectedTagIds.indexOf(tagId);
  if (index > -1) {
    selectedTagIds.splice(index, 1);
  } else {
    if (selectedTagIds.length >= 2) {
      showToast('Máximo 2 etiquetas permitidas', 'error');
      return;
    }
    selectedTagIds.push(tagId);
  }
  renderTagsInSelector();
  updateSelectedTagsUI();
}

function updateSelectedTagsUI() {
  document.getElementById('productTagId').value = selectedTagIds.join(',');
  const overlay = document.getElementById('imageTagOverlay');
  overlay.innerHTML = '';
  if (selectedTagIds.length === 0) {
    overlay.innerHTML = `<span id="imageTagPlaceholder" class="flex items-center justify-center px-2 py-1 rounded-md shadow border border-white/20 bg-slate-900/50 hover:bg-slate-900/80 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md min-w-[70px] drop-shadow-md"><i class="ph ph-tag drop-shadow-md mr-1"></i> Etiquetas</span>`;
  } else {
    selectedTagIds.forEach(id => {
      const tag = currentTags.find(t => t._id === id);
      if (tag) {
        const textColor = getContrastColor(tag.color);
        overlay.innerHTML += `<span class="flex items-center justify-center px-2 py-1 rounded-md shadow border border-white/10 text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-sm transition-all" style="background-color: ${tag.color}; color: ${textColor};"><i class="ph ph-tag mr-0.5"></i> ${tag.name}</span>`;
      }
    });
  }
}

function selectTag(id, name, color) {
  if (!id) {
    selectedTagIds = [];
  } else {
    selectedTagIds = [id];
  }
  updateSelectedTagsUI();
}

async function createNewTag() {
  const name = document.getElementById('newTagName').value.trim();
  const color = document.getElementById('newTagColor').value;
  if(!name) return showToast('Ingrese un nombre para la etiqueta', 'error');
  try {
    const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
    const data = await res.json();
    if(data.success) { document.getElementById('newTagName').value = ''; currentTags.push(data.data); renderTagsInSelector(); selectTag(data.data._id, data.data.name, data.data.color); }
    else showToast(data.error, 'error');
  } catch(e) { showToast('Error al crear etiqueta', 'error'); }
}

// -- Filter State --
const filterState = { categories: [], providers: [], tags: [], stock: 'all', image: 'all' };

function toggleCategoryFilter(categoryId) {
  const idx = filterState.categories.indexOf(categoryId);
  if (idx > -1) filterState.categories.splice(idx, 1);
  else filterState.categories.push(categoryId);
  renderCategoryFilterChips(); applyCombinedFilters();
}

function toggleProviderFilter(providerId) {
  const idx = filterState.providers.indexOf(providerId);
  if (idx > -1) filterState.providers.splice(idx, 1);
  else filterState.providers.push(providerId);
  renderProviderFilterChips(); applyCombinedFilters();
}

function toggleTagFilter(tagId) {
  const idx = filterState.tags.indexOf(tagId);
  if (idx > -1) filterState.tags.splice(idx, 1);
  else filterState.tags.push(tagId);
  renderTagFilterChips(); applyCombinedFilters();
}

function toggleStockFilter(value) {
  filterState.stock = value;
  ['all', 'inStock', 'outOfStock'].forEach(btn => {
    const el = document.getElementById(`stock-filter-${btn}`);
    if (!el) return;
    const icon = el.querySelector('i');
    if (btn === value) { el.className = 'stock-filter-btn py-2.5 px-4 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition-all bg-indigo-500/15 border-indigo-500/80 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.1)]'; if (icon) icon.className = 'ph-fill ph-check-circle text-indigo-400 text-base'; }
    else { el.className = 'stock-filter-btn py-2.5 px-4 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition-all bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'; if (icon) icon.className = 'ph ph-circle text-base'; }
  });
  
  // Update quick filter buttons classes
  ['all', 'inStock', 'outOfStock'].forEach(btn => {
    const el = document.getElementById(`quick-stock-filter-${btn}`);
    if (!el) return;
    if (btn === value) {
      el.className = 'quick-stock-filter-btn px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-500/15 border border-indigo-500/80 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
    } else {
      el.className = 'quick-stock-filter-btn px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200';
    }
  });
  
  applyCombinedFilters();
}

function toggleImageFilter(value) {
  filterState.image = value;
  ['all', 'hasImage', 'noImage'].forEach(btn => {
    const el = document.getElementById(`image-filter-${btn}`);
    if (!el) return;
    if (btn === value) el.className = 'image-filter-btn py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition-all bg-indigo-500/15 border-indigo-500/80 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
    else el.className = 'image-filter-btn py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition-all bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200';
  });
  applyCombinedFilters();
}

function clearAllFilters() {
  filterState.categories = []; filterState.providers = []; filterState.tags = []; filterState.stock = 'all'; filterState.image = 'all';
  const filterMarginMinInput = document.getElementById('filterMarginMin');
  if (filterMarginMinInput) filterMarginMinInput.value = '';
  renderCategoryFilterChips(); renderProviderFilterChips(); renderTagFilterChips(); toggleStockFilter('all'); toggleImageFilter('all');
  applyCombinedFilters();
}

function updateActiveFiltersCount() {
  let count = filterState.categories.length + filterState.providers.length + filterState.tags.length;
  if (filterState.stock !== 'all') count++;
  const filterMarginMinInput = document.getElementById('filterMarginMin');
  if (filterMarginMinInput && filterMarginMinInput.value !== '') count++;
  if (filterState.image !== 'all') count++;
  const badge = document.getElementById('activeFiltersBadge');
  if (badge) { if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); } else badge.classList.add('hidden'); }
}

function openFilterModal() {
  const modal = document.getElementById('filterModal');
  const content = document.getElementById('filterModalContent');
  renderCategoryFilterChips(); renderProviderFilterChips(); renderTagFilterChips();
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeFilterModal() {
  const content = document.getElementById('filterModalContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('filterModal').classList.add('hidden'), 300);
}

function applyFilters() { closeFilterModal(); }

const catColors = ['cat-accent-0','cat-accent-1','cat-accent-2','cat-accent-3','cat-accent-4','cat-accent-5','cat-accent-6','cat-accent-7'];

function renderCategoryFilterChips() {
  const container = document.getElementById('filterCategoryContainer');
  if (!container) return;
  container.innerHTML = '';
  if (currentCategories.length === 0) { container.innerHTML = '<span class="text-xs text-slate-500">No hay categorías registradas</span>'; return; }
  currentCategories.forEach(cat => {
    const isSelected = filterState.categories.includes(cat._id);
    const activeClass = isSelected ? 'bg-indigo-500/15 border-indigo-500/80 text-indigo-400 font-bold shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200';
    container.innerHTML += `<button onclick="toggleCategoryFilter('${cat._id}')" class="px-3.5 py-1.5 rounded-xl text-xs border transition-all ${activeClass}">${cat.name}</button>`;
  });
}

function renderProviderFilterChips() {
  const container = document.getElementById('filterProviderContainer');
  if (!container) return;
  container.innerHTML = '';
  if (currentProviders.length === 0) { container.innerHTML = '<span class="text-xs text-slate-500">No hay proveedores registrados</span>'; return; }
  currentProviders.forEach(prov => {
    const isSelected = filterState.providers.includes(prov._id);
    const activeClass = isSelected ? 'bg-indigo-500/15 border-indigo-500/80 text-indigo-400 font-bold shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200';
    container.innerHTML += `<button onclick="toggleProviderFilter('${prov._id}')" class="px-3.5 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${activeClass}"><i class="ph-fill ph-truck"></i>${prov.name}</button>`;
  });
}

function renderTagFilterChips() {
  const container = document.getElementById('filterTagContainer');
  if (!container) return;
  container.innerHTML = '';
  if (currentTags.length === 0) { container.innerHTML = '<span class="text-xs text-slate-500">No hay etiquetas registradas</span>'; return; }
  currentTags.forEach(tag => {
    const isSelected = filterState.tags.includes(tag._id);
    const activeStyle = isSelected ? `background-color: ${tag.color}20; border-color: ${tag.color}; color: ${tag.color}; font-weight: bold;` : `background-color: rgba(30, 41, 59, 0.4); border-color: rgba(51, 65, 85, 0.5); color: #94a3b8;`;
    container.innerHTML += `<button onclick="toggleTagFilter('${tag._id}')" class="px-3.5 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5" style="${activeStyle}"><span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${tag.color};"></span>${tag.name}</button>`;
  });
}

function applyCombinedFilters() {
  const searchQuery = cleanSearchString(document.getElementById('searchInput').value);
  let filtered = currentProducts;
  if (searchQuery) filtered = filtered.filter(p => (p.name && cleanSearchString(p.name).includes(searchQuery)) || (p.sku && cleanSearchString(p.sku).includes(searchQuery)));
  if (filterState.categories.length > 0) filtered = filtered.filter(p => {
    const catId = getCategoryId(p);
    return filterState.categories.includes(catId);
  });
  if (filterState.providers.length > 0) filtered = filtered.filter(p => {
    const provId = p.provider ? (typeof p.provider === 'object' ? p.provider._id : p.provider) : null;
    return provId && filterState.providers.includes(provId);
  });
  if (filterState.tags.length > 0) filtered = filtered.filter(p => {
    const pTags = (p.tags && p.tags.length > 0) ? p.tags : (p.tag ? [p.tag] : []);
    return pTags.some(t => filterState.tags.includes(t._id || t));
  });
  if (filterState.stock !== 'all') {
    if (filterState.stock === 'inStock') filtered = filtered.filter(p => p.stock > 0);

    else if (filterState.stock === 'outOfStock') filtered = filtered.filter(p => p.stock === 0);
  }
  const mInput = document.getElementById('filterMarginMin');
  const mVal = mInput ? parseInt(mInput.value, 10) : NaN;
  if (!isNaN(mVal)) filtered = filtered.filter(p => { if (!p.purchasePrice || p.purchasePrice <= 0) return false; return Math.round(((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100) >= mVal; });
  if (filterState.image !== 'all') { if (filterState.image === 'hasImage') filtered = filtered.filter(p => p.fileId); else filtered = filtered.filter(p => !p.fileId); }
  renderProducts(filtered);
  updateActiveFiltersCount();
}

// -- API Calls --
async function fetchProducts() {
  try {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    if (data.success) { currentProducts = data.data; applyCombinedFilters(); }
  } catch (error) { showToast('Error cargando productos', 'error'); }
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) currentCategories = data.data;
  } catch (error) { showToast('Error cargando categorías', 'error'); }
}

async function fetchProviders() {
  try {
    const res = await fetch('/api/providers');
    const data = await res.json();
    if (data.success) currentProviders = data.data;
  } catch (error) { showToast('Error cargando proveedores', 'error'); }
}

// -- Render Products --
function getCategoryName(product) {
  if (product.category && typeof product.category === 'object') return product.category.name;
  if (typeof product.category === 'string') {
    const cat = currentCategories.find(c => c._id === product.category);
    return cat ? cat.name : product.category;
  }
  return 'Sin categoría';
}

function getProviderName(product) {
  if (!product.provider) return 'Sin proveedor';
  if (typeof product.provider === 'object') return product.provider.name;
  const prov = currentProviders.find(p => p._id === product.provider);
  return prov ? prov.name : product.provider;
}

function getCategoryId(product) {
  if (product.category && typeof product.category === 'object') return product.category._id;
  return product.category;
}

function getTagsBadgeHtml(product) {
  const productTags = (product.tags && product.tags.length > 0) ? product.tags : (product.tag ? [product.tag] : []);
  if (productTags.length === 0) return '';
  
  if (productTags.length === 1) {
    const t1 = productTags[0];
    if (!t1 || !t1.name) return '';
    const textColor1 = getContrastColor(t1.color || '#6366f1');
    return `
      <div class="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none rounded-tr-3xl z-10">
        <div class="absolute top-[22px] right-[-40px] rotate-45 w-[140px] text-center text-[8px] md:text-[9px] font-black py-0.5 text-white shadow-sm uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2" style="background-color: ${t1.color || '#6366f1'}; color: ${textColor1};" title="${t1.name}">
          ${t1.name}
        </div>
      </div>
    `;
  }
  
  // 2 tags
  const t1 = productTags[0];
  const t2 = productTags[1];
  const hasT1 = t1 && t1.name;
  const hasT2 = t2 && t2.name;
  
  if (!hasT1 && !hasT2) return '';
  if (hasT1 && !hasT2) {
    const textColor1 = getContrastColor(t1.color || '#6366f1');
    return `
      <div class="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none rounded-tr-3xl z-10">
        <div class="absolute top-[22px] right-[-40px] rotate-45 w-[140px] text-center text-[8px] md:text-[9px] font-black py-0.5 text-white shadow-sm uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2" style="background-color: ${t1.color || '#6366f1'}; color: ${textColor1};" title="${t1.name}">
          ${t1.name}
        </div>
      </div>
    `;
  }
  if (!hasT1 && hasT2) {
    const textColor2 = getContrastColor(t2.color || '#6366f1');
    return `
      <div class="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none rounded-tr-3xl z-10">
        <div class="absolute top-[22px] right-[-40px] rotate-45 w-[140px] text-center text-[8px] md:text-[9px] font-black py-0.5 text-white shadow-sm uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2" style="background-color: ${t2.color || '#6366f1'}; color: ${textColor2};" title="${t2.name}">
          ${t2.name}
        </div>
      </div>
    `;
  }
  
  const textColor1 = getContrastColor(t1.color || '#6366f1');
  const textColor2 = getContrastColor(t2.color || '#6366f1');
  
  return `
    <div class="absolute top-0 right-0 overflow-hidden w-28 h-28 pointer-events-none rounded-tr-3xl z-10">
      <div class="absolute top-[12px] right-[-45px] rotate-45 w-[140px] text-center text-[7px] md:text-[7.5px] font-black py-0.5 text-white shadow-sm uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2" style="background-color: ${t1.color || '#6366f1'}; color: ${textColor1}; z-index: 12;" title="${t1.name}">
        ${t1.name}
      </div>
      <div class="absolute top-[36px] right-[-45px] rotate-45 w-[140px] text-center text-[7px] md:text-[7.5px] font-black py-0.5 text-white shadow-sm uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2" style="background-color: ${t2.color || '#6366f1'}; color: ${textColor2}; z-index: 11;" title="${t2.name}">
        ${t2.name}
      </div>
    </div>
  `;
}

function renderProducts(productsToRender = currentProducts) {
  const container = document.getElementById('productList');
  container.innerHTML = '';
  if (productsToRender.length === 0) {
    container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-center py-16 px-4 glass-card rounded-3xl border border-dashed border-slate-700"><div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700"><i class="ph-duotone ph-package text-4xl text-slate-500"></i></div><h3 class="text-lg font-bold text-white mb-1">No hay productos</h3><p class="text-sm text-slate-400 max-w-sm mb-6">No se encontraron productos que coincidan con la búsqueda o filtros aplicados.</p><button onclick="clearAllFilters()" class="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl px-6 py-2.5 flex items-center justify-center gap-2 transition-colors font-medium text-sm">Limpiar Filtros</button></div>`;
    return;
  }
  productsToRender.forEach(product => {
    const isLowStock = product.stock <= product.minStock;
    const stockColor = isLowStock ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    const stockIcon = isLowStock ? 'ph-warning-circle' : 'ph-check-circle';
    const categoryName = getCategoryName(product);
    const colorDotsHtml = getColorsDotsHtml(product);
    
    const imageContainerHtml = `
      <div class="relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-slate-700/50">
        ${product.fileId ? `
          <img src="/api/drive-image/${product.fileId}" class="w-full h-full object-cover bg-slate-800" onerror="this.outerHTML='<div class=\\'w-full h-full bg-slate-800 flex items-center justify-center text-slate-500\\'><i class=\\'ph ph-image text-3xl\\'></i></div>'">
        ` : `
          <div class="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500"><i class="ph ph-image text-3xl"></i></div>
        `}
        ${product.stock === 0 ? `
          <div class="absolute inset-0 bg-red-950/15 pointer-events-none z-10"></div>
          <div class="absolute top-0 right-0 overflow-hidden w-12 h-12 pointer-events-none z-20">
            <div class="absolute top-[8px] right-[-24px] rotate-45 w-[85px] text-center text-[7px] md:text-[8px] font-black py-0.5 text-white bg-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.35)] uppercase tracking-wider border-b border-red-400/30">
              Agotado
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const actionButtons = `<div class="flex gap-2 w-full mt-4 pt-4 border-t border-slate-700/30"><button onclick="editProduct('${product._id}')" class="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-indigo-400 bg-slate-800/50 hover:bg-indigo-500/10 rounded-xl transition-colors border border-slate-700/50"><i class="ph-bold ph-pencil-simple text-sm"></i> Editar</button>${['Super Admin', 'Administrador'].includes(userRole) ? `<button onclick="deleteProduct('${product._id}')" class="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 rounded-xl transition-colors border border-slate-700/50"><i class="ph-bold ph-trash text-sm"></i> Eliminar</button>` : ''}</div>`;
    container.insertAdjacentHTML('beforeend', `<div class="glass-card rounded-3xl p-4 md:p-5 flex flex-col card-hover border border-slate-700/50 group relative overflow-hidden">${getTagsBadgeHtml(product)}<div class="flex gap-4">${imageContainerHtml}<div class="flex-1 min-w-0 flex flex-col justify-center"><h3 class="font-bold text-white truncate text-base md:text-lg mb-1 group-hover:text-indigo-300 transition-colors pr-10">${product.name}</h3><div class="text-xs text-slate-400 mb-2 truncate font-medium flex items-center gap-1.5"><i class="ph-fill ph-tag text-slate-500"></i> ${categoryName}</div><div class="flex items-center gap-2"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${stockColor} border whitespace-nowrap uppercase tracking-wider"><i class="ph-fill ${stockIcon}"></i> ${product.stock} disp</span>${product.sku ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 uppercase">SKU: ${product.sku}</span>` : ''}</div>${colorDotsHtml}</div></div><div class="mt-4 flex justify-between items-end px-1"><div><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Precio Venta</p><div class="text-xl font-bold text-indigo-400 tracking-tight">$${Math.round(product.salePrice).toLocaleString('es-CO')}</div></div></div>${actionButtons}</div>`);
  });
}

// -- Modal Management --
function openProductModal(product = null) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('modalContent');
  const deleteBtn = document.getElementById('modalDeleteBtn');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('imagePreview').src = '';
  document.getElementById('imagePlaceholder').classList.remove('hidden');
  selectedTagIds = [];
  updateSelectedTagsUI();
  productColors = [];
  renderColorRows();
  document.getElementById('profitMargin').value = '';
  document.getElementById('selectedCategoryId').value = '';
  if (product) {
    document.getElementById('modalTitle').innerHTML = '<i class="ph-fill ph-pencil-simple text-indigo-400"></i> Editar Producto';
    document.getElementById('productId').value = product._id;
    document.getElementById('name').value = product.name;
    document.getElementById('sku').value = product.sku || '';
    // Set category display name and hidden ID
    const catName = getCategoryName(product);
    const catId = getCategoryId(product);
    document.getElementById('category').value = catName;
    document.getElementById('selectedCategoryId').value = catId;
    
    // Set provider
    const provName = getProviderName(product);
    const provId = product.provider ? (typeof product.provider === 'object' ? product.provider._id : product.provider) : '';
    document.getElementById('provider').value = provId ? provName : '';
    document.getElementById('selectedProviderId').value = provId;
    
    document.getElementById('description').value = product.description || '';
    document.getElementById('purchasePrice').value = Math.round(product.purchasePrice).toLocaleString('es-CO');
    document.getElementById('salePrice').value = Math.round(product.salePrice).toLocaleString('es-CO');
    calculateMarginFromPrice();
    document.getElementById('stock').value = product.stock;
    selectedTagIds = [];
    if (product.tags && product.tags.length > 0) {
      selectedTagIds = product.tags.map(t => t._id || t);
    } else if (product.tag) {
      selectedTagIds = [product.tag._id || product.tag];
    }
    updateSelectedTagsUI();
    document.getElementById('minStock').value = product.minStock;
    // Load existing colors
    productColors = (product.colors || []).map(c => ({ name: c.name, hex: c.hex, stock: c.stock || 0 }));
    renderColorRows();
    if (product.fileId) { document.getElementById('imagePreview').src = `/api/drive-image/${product.fileId}`; document.getElementById('imagePreview').classList.remove('hidden'); document.getElementById('imagePlaceholder').classList.add('hidden'); }
    
    // Show delete button in modal if user has permissions
    if (['Super Admin', 'Administrador'].includes(userRole)) {
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }
  } else {
    document.getElementById('modalTitle').innerHTML = '<i class="ph-fill ph-package text-indigo-400"></i> Nuevo Producto';
    document.getElementById('provider').value = '';
    document.getElementById('selectedProviderId').value = '';
    if (deleteBtn) deleteBtn.classList.add('hidden');
  }
  modal.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

function closeProductModal() {
  const content = document.getElementById('modalContent');
  content.classList.add('translate-y-full');
  setTimeout(() => document.getElementById('productModal').classList.add('hidden'), 300);
}

function editProduct(id) {
  const product = currentProducts.find(p => p._id === id);
  if (product) openProductModal(product);
}

function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) { const preview = document.getElementById('imagePreview'); preview.src = e.target.result; preview.classList.remove('hidden'); document.getElementById('imagePlaceholder').classList.add('hidden'); }
    reader.readAsDataURL(file);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const isUpdate = !!id;
  const url = isUpdate ? `/api/inventory/${id}` : '/api/inventory';
  const method = isUpdate ? 'PUT' : 'POST';
  const formData = new FormData();
  formData.append('name', document.getElementById('name').value);
  formData.append('sku', document.getElementById('sku').value);
  const selectedCatId = document.getElementById('selectedCategoryId').value;
  if (!selectedCatId) {
    showToast('Por favor, seleccione una categoría de la lista', 'error');
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Guardar</span>'; submitBtn.disabled = false;
    return;
  }
  formData.append('category', selectedCatId);
  const selectedProvId = document.getElementById('selectedProviderId').value;
  if (selectedProvId) {
    formData.append('provider', selectedProvId);
  }
  formData.append('description', document.getElementById('description').value);
  formData.append('purchasePrice', getRawValue(document.getElementById('purchasePrice')));
  formData.append('salePrice', getRawValue(document.getElementById('salePrice')));
  formData.append('stock', getRawValue(document.getElementById('stock')));
  formData.append('minStock', getRawValue(document.getElementById('minStock')));
  const tagIds = document.getElementById('productTagId').value;
  const arrayTags = tagIds ? tagIds.split(',').filter(Boolean) : [];
  formData.append('tags', JSON.stringify(arrayTags));
  // Include colors
  const colorsData = productColors.filter(c => c.name && c.name.trim());
  formData.append('colors', JSON.stringify(colorsData));
  const imageFile = document.getElementById('productImage').files[0];
  if (imageFile) formData.append('image', imageFile);
  const submitBtn = document.getElementById('submitBtn');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> <span>Guardando...</span>'; submitBtn.disabled = true;
  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (data.success) { showToast(isUpdate ? 'Producto actualizado' : 'Producto creado exitosamente'); closeProductModal(); fetchProducts(); }
    else showToast(data.error || 'Error al guardar', 'error');
  } catch (error) { showToast('Error de conexión con el servidor', 'error'); }
  finally { submitBtn.innerHTML = originalHtml; submitBtn.disabled = false; }
}

async function deleteProduct(id) {
  if (!confirm('¿Estás seguro de eliminar este producto? Esta acción es irreversible.')) return false;
  try {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { 
      showToast('Producto eliminado del sistema'); 
      fetchProducts(); 
      return true;
    }
    else {
      showToast(data.error || 'Error al eliminar', 'error');
      return false;
    }
  } catch (error) { 
    showToast('Error de conexión', 'error'); 
    return false;
  }
}

async function deleteProductFromModal() {
  const id = document.getElementById('productId').value;
  if (!id) return;
  const success = await deleteProduct(id);
  if (success) {
    closeProductModal();
  }
}

// -- Custom Searchable Dropdown --
let catDropdownOpen = false;

function openCatDropdown() {
  const dropdown = document.getElementById('catDropdown');
  const caret = document.getElementById('catCaretIcon');
  filterCatDropdown('');
  dropdown.classList.add('open');
  caret.style.transform = 'translateY(-50%) rotate(180deg)';
  catDropdownOpen = true;
}

function closeCatDropdown() {
  document.getElementById('catDropdown').classList.remove('open');
  document.getElementById('catCaretIcon').style.transform = 'translateY(-50%) rotate(0deg)';
  catDropdownOpen = false;
}

function filterCatDropdown(query) {
  const dropdown = document.getElementById('catDropdown');
  const q = cleanSearchString(query);
  const filtered = q ? currentCategories.filter(c => cleanSearchString(c.name).includes(q)) : currentCategories;
  if (filtered.length === 0) { dropdown.innerHTML = `<div class="custom-select-empty"><i class="ph ph-magnifying-glass text-lg mb-1"></i><br>No se encontraron categorías</div>`; }
  else { dropdown.innerHTML = filtered.map(cat => { const accent = catColors[currentCategories.indexOf(cat) % catColors.length]; return `<div class="custom-select-option" onmousedown="selectCategory('${cat._id}', '${cat.name}')"><span class="w-2 h-2 rounded-full shrink-0 ${accent}" style="background: var(--cat-color);"></span>${cat.name}</div>`; }).join(''); }
}

function selectCategory(id, name) {
  document.getElementById('category').value = name;
  document.getElementById('selectedCategoryId').value = id;
  closeCatDropdown();
}

document.addEventListener('click', (e) => { if (catDropdownOpen && !e.target.closest('.custom-select-wrapper')) closeCatDropdown(); });

// -- Custom Searchable Dropdown for Provider --
let provDropdownOpen = false;

function openProvDropdown() {
  const dropdown = document.getElementById('provDropdown');
  const caret = document.getElementById('provCaretIcon');
  filterProvDropdown('');
  dropdown.classList.add('open');
  caret.style.transform = 'translateY(-50%) rotate(180deg)';
  provDropdownOpen = true;
}

function closeProvDropdown() {
  document.getElementById('provDropdown').classList.remove('open');
  document.getElementById('provCaretIcon').style.transform = 'translateY(-50%) rotate(0deg)';
  provDropdownOpen = false;
}

function filterProvDropdown(query) {
  const dropdown = document.getElementById('provDropdown');
  const q = cleanSearchString(query);
  const filtered = q ? currentProviders.filter(p => cleanSearchString(p.name).includes(q)) : currentProviders;
  if (filtered.length === 0) { dropdown.innerHTML = `<div class="custom-select-empty"><i class="ph ph-magnifying-glass text-lg mb-1"></i><br>No se encontraron proveedores</div>`; }
  else { dropdown.innerHTML = filtered.map(prov => { return `<div class="custom-select-option" onmousedown="selectProvider('${prov._id}', '${prov.name}')"><span class="w-2 h-2 rounded-full shrink-0 bg-indigo-500"></span>${prov.name}</div>`; }).join(''); }
}

function selectProvider(id, name) {
  document.getElementById('provider').value = name;
  document.getElementById('selectedProviderId').value = id;
  closeProvDropdown();
}

document.addEventListener('click', (e) => { 
  if (catDropdownOpen && !e.target.closest('#category') && !e.target.closest('#catDropdown')) closeCatDropdown(); 
  if (provDropdownOpen && !e.target.closest('#provider') && !e.target.closest('#provDropdown')) closeProvDropdown(); 
});

// -- Init --
document.addEventListener('DOMContentLoaded', () => {
  fetchTags();
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) { filterState.categories.push(categoryParam); }
  const providerParam = urlParams.get('provider');
  if (providerParam) { filterState.providers.push(providerParam); }
  const tagParam = urlParams.get('tag');
  if (tagParam) { filterState.tags.push(tagParam); }
  fetchProducts();
  fetchCategories();
  fetchProviders();
  document.getElementById('searchInput').addEventListener('input', () => applyCombinedFilters());
  document.getElementById('productForm').addEventListener('submit', handleFormSubmit);

  // -- Drag and Drop for Product Image --
  const imageDropZone = document.getElementById('imageDropZone');
  if (imageDropZone) {
    let dragCounter = 0;

    imageDropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        imageDropZone.classList.add('border-indigo-500', 'bg-indigo-500/10', 'scale-[1.02]');
        imageDropZone.classList.remove('border-slate-600', 'bg-slate-800/80');
      }
    });

    imageDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    imageDropZone.addEventListener('dragleave', (e) => {
      dragCounter--;
      if (dragCounter === 0) {
        imageDropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10', 'scale-[1.02]');
        imageDropZone.classList.add('border-slate-600', 'bg-slate-800/80');
      }
    });

    imageDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      imageDropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10', 'scale-[1.02]');
      imageDropZone.classList.add('border-slate-600', 'bg-slate-800/80');

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const fileInput = document.getElementById('productImage');
          fileInput.files = files;
          previewImage({ target: fileInput });
        } else {
          showToast('Por favor, selecciona un archivo de imagen válido', 'error');
        }
      }
    });
  }
});
