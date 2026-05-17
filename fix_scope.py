import re

with open('src/views/dashboard.ejs', 'r') as f:
    content = f.read()

# The previously added JS:
js_additions = """
    let currentTags = [];

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

    function calculatePriceFromMargin() {
      const cost = getRawValue(document.getElementById('purchasePrice'));
      const margin = parseFloat(document.getElementById('profitMargin').value) || 0;
      if(cost > 0 && margin >= 0) {
        const sale = cost + (cost * (margin / 100));
        const saleInput = document.getElementById('salePrice');
        saleInput.value = Math.round(sale).toLocaleString('es-CO');
      }
    }

    function calculateMarginFromPrice() {
      const cost = getRawValue(document.getElementById('purchasePrice'));
      const sale = getRawValue(document.getElementById('salePrice'));
      if(cost > 0 && sale >= cost) {
        const margin = ((sale - cost) / cost) * 100;
        document.getElementById('profitMargin').value = Math.round(margin);
      } else {
        document.getElementById('profitMargin').value = '';
      }
    }

    async function fetchTags() {
      try {
        const res = await fetch('/api/tags');
        const data = await res.json();
        if(data.success) {
          currentTags = data.data;
        }
      } catch(e) { console.error('Error fetching tags', e); }
    }

    function openTagModal() {
      const modal = document.getElementById('tagModal');
      const content = document.getElementById('tagModalContent');
      renderTags();
      modal.classList.remove('hidden');
      setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
      }, 10);
    }

    function closeTagModal() {
      const modal = document.getElementById('tagModal');
      const content = document.getElementById('tagModalContent');
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 200);
    }

    function renderTags() {
      const container = document.getElementById('tagListContainer');
      container.innerHTML = '';
      if(currentTags.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No hay etiquetas creadas.</p>';
        return;
      }
      
      // Add "None" option
      container.innerHTML += `
        <div onclick="selectTag(null, null, null)" class="px-4 py-2 rounded-xl hover:bg-slate-800 cursor-pointer flex items-center gap-3 transition-colors border border-transparent hover:border-slate-700">
          <div class="w-4 h-4 rounded-full border-2 border-slate-600"></div>
          <span class="text-sm font-medium text-slate-400">Sin Etiqueta</span>
        </div>
      `;

      currentTags.forEach(tag => {
        container.innerHTML += `
          <div onclick="selectTag('${tag._id}', '${tag.name}', '${tag.color}')" class="px-4 py-2 rounded-xl hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors border border-transparent hover:border-slate-700 group">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full" style="background-color: ${tag.color};"></div>
              <span class="text-sm font-medium text-white">${tag.name}</span>
            </div>
            <button onclick="event.stopPropagation(); deleteTag('${tag._id}')" class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
              <i class="ph-bold ph-x"></i>
            </button>
          </div>
        `;
      });
    }

    function selectTag(id, name, color) {
      document.getElementById('productTagId').value = id || '';
      const overlay = document.getElementById('imageTagOverlay');
      const label = document.getElementById('imageTagLabel');
      
      if(id) {
        overlay.style.backgroundColor = color;
        overlay.style.border = 'none';
        label.innerText = name;
      } else {
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
        overlay.style.border = '1px solid rgba(255,255,255,0.2)';
        label.innerText = 'Etiqueta';
      }
      closeTagModal();
    }

    async function createNewTag() {
      const name = document.getElementById('newTagName').value.trim();
      const color = document.getElementById('newTagColor').value;
      if(!name) return showToast('Ingrese un nombre para la etiqueta', 'error');
      
      try {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color })
        });
        const data = await res.json();
        if(data.success) {
          document.getElementById('newTagName').value = '';
          currentTags.push(data.data);
          renderTags();
          selectTag(data.data._id, data.data.name, data.data.color);
        } else {
          showToast(data.error, 'error');
        }
      } catch(e) { showToast('Error al crear etiqueta', 'error'); }
    }

    async function deleteTag(id) {
      if(!confirm('¿Eliminar etiqueta?')) return;
      try {
        const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
        if(res.ok) {
          currentTags = currentTags.filter(t => t._id !== id);
          if(document.getElementById('productTagId').value === id) {
             selectTag(null, null, null);
          }
          renderTags();
        }
      } catch(e) { showToast('Error', 'error'); }
    }
"""

if js_additions in content:
    # Remove the inner js_additions
    content = content.replace(js_additions, "")
    # Place it before document.addEventListener('DOMContentLoaded'
    content = content.replace("document.addEventListener('DOMContentLoaded', () => {", js_additions + "\n    document.addEventListener('DOMContentLoaded', () => {")
    with open('src/views/dashboard.ejs', 'w') as f:
        f.write(content)
    print("Fixed scope issue")
else:
    print("js_additions block not found")
