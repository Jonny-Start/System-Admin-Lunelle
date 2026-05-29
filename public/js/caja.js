// ══════════════════════════════════════════════════════════════
// Caja Controller - Lunele Admin
// ══════════════════════════════════════════════════════════════

let paymentMethods = [];
const isAdmin = window.userRole === 'Super Admin' || window.userRole === 'Administrador';

// ─── Helpers ───
function fmtMoney(v) {
  return '$' + Math.round(v || 0).toLocaleString('es-CO');
}

function getTimeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'Ahora';
  if (s < 3600) return `hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)}d`;
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => loadPaymentMethods());

// ─── Load Data ───
async function loadPaymentMethods() {
  try {
    const res = await fetch('/api/payment-methods');
    const json = await res.json();
    if (!json.success) throw new Error('API error');
    paymentMethods = json.data;
    renderKPI();
    renderCards();
    renderTable();
    renderAdjustmentHistory();
  } catch (e) {
    console.error('Error loading payment methods:', e);
  }
}

// ─── Total KPI ───
function renderKPI() {
  const total = paymentMethods.reduce((sum, m) => sum + (m.balance || 0), 0);
  document.getElementById('kpi-total-caja').textContent = fmtMoney(total);
}

// ─── Cards ───
function renderCards() {
  const container = document.getElementById('paymentMethodsCards');

  if (!paymentMethods.length) {
    container.innerHTML = `
      <div class="glass-card rounded-2xl p-6 col-span-full flex flex-col items-center justify-center py-10">
        <i class="ph-duotone ph-wallet text-4xl text-slate-600 mb-3"></i>
        <p class="text-sm text-slate-400 font-medium">No hay métodos de pago</p>
        <p class="text-xs text-slate-600">Crea uno para comenzar</p>
      </div>`;
    return;
  }

  container.innerHTML = paymentMethods.map(m => {
    const isNegative = m.balance < 0;
    return `
    <div class="glass-card rounded-2xl p-5 relative overflow-hidden group card-hover cursor-default" style="animation: cardSlideUp 0.3s ease-out both">
      <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl transition-all" style="background: ${m.color}15;"></div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border" style="background: ${m.color}15; color: ${m.color}; border-color: ${m.color}20;">
            <i class="ph-fill ${m.icon}"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-white">${m.name}</p>
            <div class="w-3 h-3 rounded-full inline-block" style="background: ${m.color};"></div>
          </div>
        </div>
      </div>
      <h3 class="text-xl md:text-2xl font-bold tracking-tight ${isNegative ? 'text-red-400' : 'text-white'}">${fmtMoney(m.balance)}</h3>
      <p class="text-[10px] text-slate-500 mt-1">Saldo actual</p>
    </div>`;
  }).join('');
}

// ─── Table ───
function renderTable() {
  const container = document.getElementById('methodsListContainer');

  if (!paymentMethods.length) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500">
        <div class="flex flex-col items-center justify-center py-8">
          <i class="ph-duotone ph-wallet text-4xl text-slate-600 mb-3"></i>
          <p class="text-sm font-medium">No hay métodos de pago configurados</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = paymentMethods.map(m => {
    const isNegative = m.balance < 0;
    const actions = isAdmin ? `
      <div class="flex items-center gap-1 justify-end">
        <button onclick="openAdjustModal('${m._id}')" class="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all" title="Ajustar saldo">
          <i class="ph ph-pencil-simple-line text-base"></i>
        </button>
        <button onclick="openMethodModal('${m._id}')" class="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-all" title="Editar método">
          <i class="ph ph-gear text-base"></i>
        </button>
        <button onclick="deleteMethod('${m._id}', '${m.name}')" class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Desactivar">
          <i class="ph ph-trash text-base"></i>
        </button>
      </div>` : '<span class="text-xs text-slate-600">—</span>';

    return `
    <div class="px-4 md:px-6 py-4 hover:bg-slate-800/20 transition-colors" style="animation: cardSlideUp 0.2s ease-out both">
      <!-- Mobile Layout -->
      <div class="md:hidden flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border" style="background: ${m.color}15; color: ${m.color}; border-color: ${m.color}20;">
            <i class="ph-fill ${m.icon}"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-white">${m.name}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <div class="w-2.5 h-2.5 rounded-full" style="background: ${m.color};"></div>
              <span class="text-[10px] text-slate-500">${m.color}</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold ${isNegative ? 'text-red-400' : 'text-white'}">${fmtMoney(m.balance)}</p>
          ${isAdmin ? `<button onclick="openAdjustModal('${m._id}')" class="text-[10px] text-blue-400 hover:text-blue-300 mt-0.5">Ajustar</button>` : ''}
        </div>
      </div>
      <!-- Desktop Layout -->
      <div class="hidden md:grid grid-cols-12 gap-4 items-center">
        <div class="col-span-1">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg border" style="background: ${m.color}15; color: ${m.color}; border-color: ${m.color}20;">
            <i class="ph-fill ${m.icon}"></i>
          </div>
        </div>
        <div class="col-span-3">
          <p class="text-sm font-semibold text-white">${m.name}</p>
        </div>
        <div class="col-span-2 flex items-center gap-2">
          <div class="w-5 h-5 rounded-md border border-slate-700/50" style="background: ${m.color};"></div>
          <span class="text-xs text-slate-400 font-mono">${m.color}</span>
        </div>
        <div class="col-span-3">
          <span class="text-base font-bold ${isNegative ? 'text-red-400' : 'text-white'}">${fmtMoney(m.balance)}</span>
        </div>
        <div class="col-span-3">
          ${actions}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Adjustment History ───
function renderAdjustmentHistory() {
  const container = document.getElementById('adjustmentHistory');
  
  // Gather all adjustments from all methods
  const allAdjustments = [];
  paymentMethods.forEach(m => {
    if (m.adjustments && m.adjustments.length) {
      m.adjustments.forEach(a => {
        allAdjustments.push({ ...a, methodName: m.name, methodColor: m.color, methodIcon: m.icon });
      });
    }
  });

  // Sort by date descending
  allAdjustments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!allAdjustments.length) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <i class="ph-duotone ph-check-circle text-3xl text-slate-600 mb-2"></i>
        <p class="text-sm text-slate-400 font-medium">Sin ajustes registrados</p>
        <p class="text-xs text-slate-600">Los ajustes manuales aparecerán aquí</p>
      </div>`;
    return;
  }

  container.innerHTML = allAdjustments.slice(0, 20).map(a => {
    const diff = a.newBalance - a.previousBalance;
    const isPositive = diff >= 0;
    return `
    <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/20 transition-all hover:bg-slate-800/40">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border" style="background: ${a.methodColor}15; color: ${a.methodColor}; border-color: ${a.methodColor}20;">
        <i class="ph-fill ${a.methodIcon}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white truncate">${a.methodName} — ${a.reason || 'Ajuste manual'}</p>
        <p class="text-[10px] text-slate-500">${fmtMoney(a.previousBalance)} → ${fmtMoney(a.newBalance)}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}">${isPositive ? '+' : ''}${fmtMoney(diff)}</p>
        <p class="text-[10px] text-slate-600">${getTimeAgo(a.createdAt)}</p>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════ METHOD MODAL ═══════════════

function openMethodModal(id) {
  const modal = document.getElementById('methodModal');
  const title = document.getElementById('methodModalTitle');

  if (id) {
    const m = paymentMethods.find(pm => pm._id === id);
    if (!m) return;
    title.innerHTML = `
      <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm shadow-lg">
        <i class="ph-fill ph-wallet"></i>
      </span> Editar Método`;
    document.getElementById('methodId').value = m._id;
    document.getElementById('methodName').value = m.name;
    document.getElementById('methodIcon').value = m.icon;
    document.getElementById('methodColor').value = m.color;
    document.getElementById('methodColorHex').textContent = m.color;
  } else {
    title.innerHTML = `
      <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm shadow-lg">
        <i class="ph-fill ph-wallet"></i>
      </span> Nuevo Método de Pago`;
    document.getElementById('methodId').value = '';
    document.getElementById('methodName').value = '';
    document.getElementById('methodIcon').value = 'ph-money';
    document.getElementById('methodColor').value = '#10b981';
    document.getElementById('methodColorHex').textContent = '#10b981';
  }

  modal.classList.remove('hidden');
}

function closeMethodModal() {
  document.getElementById('methodModal').classList.add('hidden');
}

async function submitMethod() {
  const btn = document.getElementById('methodSubmitBtn');
  const id = document.getElementById('methodId').value;
  const name = document.getElementById('methodName').value.trim();
  const icon = document.getElementById('methodIcon').value;
  const color = document.getElementById('methodColor').value;

  if (!name) {
    showToast('El nombre es requerido', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner text-lg animate-spin"></i> Guardando...';

  try {
    const url = id ? `/api/payment-methods/${id}` : '/api/payment-methods';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, color })
    });

    const json = await res.json();
    if (json.success) {
      showToast(id ? 'Método actualizado' : 'Método creado exitosamente');
      closeMethodModal();
      await loadPaymentMethods();
    } else {
      showToast(json.error || 'Error al guardar', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-fill ph-check-circle text-lg"></i> Guardar';
  }
}

// Color hex preview
document.getElementById('methodColor')?.addEventListener('input', function() {
  document.getElementById('methodColorHex').textContent = this.value;
});

// ═══════════════ ADJUST MODAL ═══════════════

function openAdjustModal(id) {
  const m = paymentMethods.find(pm => pm._id === id);
  if (!m) return;

  document.getElementById('adjustMethodId').value = m._id;
  document.getElementById('adjustModalTitle').textContent = `Ajustar — ${m.name}`;
  document.getElementById('adjustCurrentBalance').textContent = fmtMoney(m.balance);
  document.getElementById('adjustNewBalance').value = '';
  document.getElementById('adjustReason').value = '';
  document.getElementById('adjustModal').classList.remove('hidden');
}

function closeAdjustModal() {
  document.getElementById('adjustModal').classList.add('hidden');
}

async function submitAdjust() {
  const btn = document.getElementById('adjustSubmitBtn');
  const id = document.getElementById('adjustMethodId').value;
  const rawBalance = document.getElementById('adjustNewBalance').value.replace(/\D/g, '');
  const newBalance = rawBalance === '' ? 0 : parseInt(rawBalance, 10);
  const reason = document.getElementById('adjustReason').value.trim();

  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner text-lg animate-spin"></i> Procesando...';

  try {
    const res = await fetch(`/api/payment-methods/${id}/adjust`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newBalance, reason })
    });

    const json = await res.json();
    if (json.success) {
      showToast('Saldo ajustado exitosamente');
      closeAdjustModal();
      await loadPaymentMethods();
    } else {
      showToast(json.error || 'Error al ajustar saldo', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-fill ph-check-circle text-lg"></i> Confirmar Ajuste';
  }
}

// ═══════════════ DELETE METHOD ═══════════════

async function deleteMethod(id, name) {
  if (!confirm(`¿Desactivar el método de pago "${name}"? Las ventas existentes no se verán afectadas.`)) return;

  try {
    const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(`"${name}" desactivado`);
      await loadPaymentMethods();
    } else {
      showToast(json.error || 'Error al desactivar', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}
