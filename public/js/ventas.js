// ══════════════════════════════════════════════════════════════════════
// ventas.js — Sales page logic: list, filter, charts, detail
// ══════════════════════════════════════════════════════════════════════

let salesData = [];
let salesCurrentPage = 1;
let dailyChart = null;
let paymentChart = null;

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSalesStats();
  loadSales();
  loadPaymentMethodFilter();

  // Debounced search
  let searchTimer;
  document.getElementById('salesSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { salesCurrentPage = 1; loadSales(); }, 400);
  });

  // Filters
  document.getElementById('salesDateFrom').addEventListener('change', () => { salesCurrentPage = 1; loadSales(); });
  document.getElementById('salesDateTo').addEventListener('change', () => { salesCurrentPage = 1; loadSales(); });
  document.getElementById('salesPaymentFilter').addEventListener('change', () => { salesCurrentPage = 1; loadSales(); });
});

// ── Load Payment Method Filter Options ─────────────────────────────
let paymentMethodsMap = {};
async function loadPaymentMethodFilter() {
  try {
    const res = await fetch('/api/payment-methods');
    const json = await res.json();
    if (!json.success) return;
    const select = document.getElementById('salesPaymentFilter');
    // Keep the first "Todos" option
    const firstOpt = select.querySelector('option[value=""]');
    select.innerHTML = '';
    select.appendChild(firstOpt);
    json.data.forEach(m => {
      paymentMethodsMap[m.name] = { icon: m.icon, color: m.color };
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      select.appendChild(opt);
    });
  } catch (e) { console.error(e); }
}

// ── Load Stats + Charts ────────────────────────────────────────────
async function loadSalesStats() {
  try {
    const res = await fetch('/api/sales/stats');
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;
    const fmt = v => '$' + Number(v).toLocaleString('es-CO');

    document.getElementById('kpi-sales-today').textContent = fmt(d.today.total);
    document.getElementById('kpi-sales-week').textContent = fmt(d.week.total);
    document.getElementById('kpi-sales-month').textContent = fmt(d.month.total);
    document.getElementById('kpi-profit-month').textContent = fmt(d.month.profit);

    renderDailyChart(d.dailyChart);
    renderPaymentMethodChart(d.paymentMethods);
  } catch (err) {
    console.error('Error loading sales stats:', err);
  }
}

function renderDailyChart(data) {
  const ctx = document.getElementById('salesDailyChart');
  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Ventas',
          data: data.sales,
          backgroundColor: 'rgba(52, 211, 153, 0.3)',
          borderColor: 'rgba(52, 211, 153, 1)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        },
        {
          label: 'Ganancia',
          data: data.profit,
          backgroundColor: 'rgba(251, 191, 36, 0.25)',
          borderColor: 'rgba(251, 191, 36, 1)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11, weight: '600' }, usePointStyle: true, pointStyleWidth: 8, padding: 20 }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(99,102,241,0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: $${ctx.raw.toLocaleString('es-CO')}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 11, weight: '600' } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: v => '$' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v)
          },
          grid: { color: 'rgba(51,65,85,0.3)' }
        }
      }
    }
  });
}

function renderPaymentMethodChart(methods) {
  const ctx = document.getElementById('paymentMethodChart');
  const emptyEl = document.getElementById('paymentChartEmpty');

  if (!methods.length) {
    ctx.style.display = 'none';
    emptyEl.classList.remove('hidden');
    return;
  }
  ctx.style.display = '';
  emptyEl.classList.add('hidden');

  if (paymentChart) paymentChart.destroy();

  const colors = {
    'Efectivo': { bg: 'rgba(52, 211, 153, 0.7)', border: '#34d399' },
    'Nequi': { bg: 'rgba(167, 139, 250, 0.7)', border: '#a78bfa' },
    'Daviplata': { bg: 'rgba(251, 146, 60, 0.7)', border: '#fb923c' },
    'Datafono': { bg: 'rgba(56, 189, 248, 0.7)', border: '#38bdf8' }
  };

  paymentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: methods.map(m => m._id),
      datasets: [{
        data: methods.map(m => m.total),
        backgroundColor: methods.map(m => (colors[m._id] || colors['Efectivo']).bg),
        borderColor: methods.map(m => (colors[m._id] || colors['Efectivo']).border),
        borderWidth: 2,
        spacing: 3,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 11, weight: '600' },
            usePointStyle: true,
            pointStyleWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(99,102,241,0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `$${ctx.raw.toLocaleString('es-CO')} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ── Load Sales List ────────────────────────────────────────────────
async function loadSales() {
  const search = document.getElementById('salesSearch').value;
  const from = document.getElementById('salesDateFrom').value;
  const to = document.getElementById('salesDateTo').value;
  const paymentMethod = document.getElementById('salesPaymentFilter').value;

  const params = new URLSearchParams({ page: salesCurrentPage, limit: 20 });
  if (search) params.set('search', search);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);

  try {
    const res = await fetch(`/api/sales?${params}`);
    const json = await res.json();
    if (!json.success) return;

    salesData = json.data;
    renderSalesList(json.data, json.total, json.page, json.pages);
  } catch (err) {
    console.error('Error loading sales:', err);
  }
}

function renderSalesList(sales, total, page, pages) {
  const container = document.getElementById('salesListContainer');

  if (!sales.length) {
    container.innerHTML = `
      <div class="p-6 text-center">
        <div class="flex flex-col items-center justify-center py-12">
          <i class="ph-duotone ph-receipt text-5xl text-slate-600 mb-3"></i>
          <p class="text-slate-400 font-semibold text-sm mb-1">Sin ventas registradas</p>
          <p class="text-slate-600 text-xs">Registra tu primera venta con el botón "Nueva Venta"</p>
        </div>
      </div>`;
    document.getElementById('salesPaginationInfo').textContent = '0 ventas';
    document.getElementById('salesPaginationBtns').innerHTML = '';
    return;
  }

  const paymentIcons = {
    'Efectivo': { icon: 'ph-money', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
    'Nequi': { icon: 'ph-device-mobile', color: 'text-violet-400 bg-violet-500/15 border-violet-500/20' },
    'Daviplata': { icon: 'ph-device-mobile-camera', color: 'text-orange-400 bg-orange-500/15 border-orange-500/20' },
    'Datafono': { icon: 'ph-credit-card', color: 'text-sky-400 bg-sky-500/15 border-sky-500/20' }
  };

  container.innerHTML = sales.map((sale, i) => {
    const pm = paymentIcons[sale.paymentMethod] || paymentIcons['Efectivo'];
    const date = new Date(sale.createdAt);
    const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const itemsSummary = sale.items.map(it => it.productName).join(', ');
    const shortId = sale._id.slice(-6).toUpperCase();
    const seller = sale.seller ? sale.seller.name : 'N/A';

    return `
      <div class="group hover:bg-slate-800/30 transition-colors cursor-pointer" onclick="viewSaleDetail('${sale._id}')" style="animation: cardSlideUp 0.3s ease-out both; animation-delay: ${i * 0.03}s">
        <!-- Mobile View -->
        <div class="md:hidden p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-10 h-10 rounded-xl ${pm.color} border flex items-center justify-center shrink-0">
                <i class="ph-fill ${pm.icon} text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white truncate">${itemsSummary}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] text-slate-500 font-mono">#${shortId}</span>
                  <span class="text-[10px] text-slate-600">•</span>
                  <span class="text-[10px] text-slate-500">${dateStr} ${timeStr}</span>
                </div>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-white">$${sale.total.toLocaleString('es-CO')}</p>
              <p class="text-[10px] font-semibold ${sale.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                ${sale.totalProfit >= 0 ? '+' : ''}$${sale.totalProfit.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
        <!-- Desktop View -->
        <div class="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3.5">
          <div class="col-span-1">
            <span class="text-xs text-slate-400 font-mono bg-slate-800/60 px-2 py-1 rounded-lg">#${shortId}</span>
          </div>
          <div class="col-span-3 min-w-0">
            <p class="text-sm text-white font-medium truncate">${itemsSummary}</p>
            <p class="text-[10px] text-slate-500 mt-0.5">${sale.items.length} producto${sale.items.length > 1 ? 's' : ''} · ${seller}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm font-bold text-white">$${sale.total.toLocaleString('es-CO')}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm font-semibold ${sale.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}">
              ${sale.totalProfit >= 0 ? '+' : ''}$${sale.totalProfit.toLocaleString('es-CO')}
            </p>
          </div>
          <div class="col-span-2">
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${pm.color}">
              <i class="ph-fill ${pm.icon}"></i> ${sale.paymentMethod}
            </span>
          </div>
          <div class="col-span-1">
            <p class="text-xs text-slate-400">${dateStr}</p>
            <p class="text-[10px] text-slate-600">${timeStr}</p>
          </div>
          <div class="col-span-1 text-right">
            <button onclick="event.stopPropagation(); viewSaleDetail('${sale._id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="Ver detalle">
              <i class="ph ph-eye text-lg"></i>
            </button>
            ${window.userRole !== 'Empleado' ? `
            <button onclick="event.stopPropagation(); confirmDeleteSale('${sale._id}', '${shortId}')" class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Anular venta">
              <i class="ph ph-trash text-lg"></i>
            </button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  // Pagination
  document.getElementById('salesPaginationInfo').textContent = `${total} venta${total !== 1 ? 's' : ''} · Página ${page} de ${pages}`;

  const btnsContainer = document.getElementById('salesPaginationBtns');
  btnsContainer.innerHTML = '';
  if (pages > 1) {
    if (page > 1) {
      btnsContainer.innerHTML += `<button onclick="goToSalesPage(${page - 1})" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 transition-all"><i class="ph ph-caret-left"></i></button>`;
    }
    for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) {
      const active = p === page ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50';
      btnsContainer.innerHTML += `<button onclick="goToSalesPage(${p})" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${active} transition-all">${p}</button>`;
    }
    if (page < pages) {
      btnsContainer.innerHTML += `<button onclick="goToSalesPage(${page + 1})" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 transition-all"><i class="ph ph-caret-right"></i></button>`;
    }
  }
}

function goToSalesPage(p) {
  salesCurrentPage = p;
  loadSales();
}

function clearSalesFilters() {
  document.getElementById('salesSearch').value = '';
  document.getElementById('salesDateFrom').value = '';
  document.getElementById('salesDateTo').value = '';
  document.getElementById('salesPaymentFilter').value = '';
  salesCurrentPage = 1;
  loadSales();
}

// ── Sale Detail ────────────────────────────────────────────────────
async function viewSaleDetail(id) {
  try {
    const res = await fetch(`/api/sales/${id}`);
    const json = await res.json();
    if (!json.success) return showToast('Error al cargar detalle', 'error');

    const sale = json.data;
    const date = new Date(sale.createdAt);

    const paymentColors = {
      'Efectivo': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      'Nequi': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
      'Daviplata': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
      'Datafono': 'bg-sky-500/15 text-sky-400 border-sky-500/20'
    };

    document.getElementById('saleDetailContent').innerHTML = `
      <div class="space-y-4">
        <!-- Header info -->
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg">#${sale._id.slice(-6).toUpperCase()}</span>
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${paymentColors[sale.paymentMethod] || ''}">${sale.paymentMethod}</span>
        </div>

        <!-- Date & Seller -->
        <div class="flex items-center gap-4 text-xs text-slate-400">
          <span class="flex items-center gap-1.5"><i class="ph ph-calendar text-sm"></i> ${date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span class="flex items-center gap-1.5"><i class="ph ph-clock text-sm"></i> ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="text-xs text-slate-500 flex items-center gap-1.5">
          <i class="ph ph-user text-sm"></i> Vendedor: <span class="text-white font-semibold">${sale.seller?.name || 'N/A'}</span>
        </div>

        <!-- Items -->
        <div class="border border-slate-700/30 rounded-2xl overflow-hidden mt-4">
          <div class="px-4 py-2.5 bg-slate-800/30 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>Producto</span>
            <span>Subtotal</span>
          </div>
          ${sale.items.map(item => `
          <div class="px-4 py-3 flex items-center justify-between border-t border-slate-800/30">
            <div class="min-w-0 flex-1">
              <p class="text-sm text-white font-medium truncate">${item.productName}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">${item.quantity} × $${item.unitPrice.toLocaleString('es-CO')}</p>
            </div>
            <div class="text-right shrink-0 ml-4">
              <p class="text-sm font-bold text-white">$${item.subtotal.toLocaleString('es-CO')}</p>
              <p class="text-[10px] font-semibold ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                ${item.profit >= 0 ? '+' : ''}$${item.profit.toLocaleString('es-CO')}
              </p>
            </div>
          </div>`).join('')}
        </div>

        <!-- Totals -->
        <div class="bg-slate-800/30 rounded-2xl p-4 space-y-2 mt-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Total venta</span>
            <span class="font-bold text-white text-lg">$${sale.total.toLocaleString('es-CO')}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Ganancia total</span>
            <span class="font-bold ${sale.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}">${sale.totalProfit >= 0 ? '+' : ''}$${sale.totalProfit.toLocaleString('es-CO')}</span>
          </div>
        </div>

        ${sale.notes ? `
        <div class="bg-slate-800/30 rounded-2xl p-4 mt-2">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notas</p>
          <p class="text-sm text-slate-300">${sale.notes}</p>
        </div>` : ''}

        ${window.userRole !== 'Empleado' ? `
        <button onclick="confirmDeleteSale('${sale._id}', '${sale._id.slice(-6).toUpperCase()}'); closeSaleDetail();" class="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-all">
          <i class="ph ph-trash text-lg"></i> Anular Venta
        </button>` : ''}
      </div>`;

    document.getElementById('saleDetailModal').classList.remove('hidden');
  } catch (err) {
    showToast('Error al cargar detalle', 'error');
  }
}

function closeSaleDetail() {
  document.getElementById('saleDetailModal').classList.add('hidden');
}

// ── Delete Sale ────────────────────────────────────────────────────
async function confirmDeleteSale(id, shortId) {
  if (!confirm(`¿Anular la venta #${shortId}?\nSe devolverá el stock a los productos.`)) return;

  try {
    const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Venta anulada correctamente');
      loadSales();
      loadSalesStats();
    } else {
      showToast(json.error || 'Error al anular venta', 'error');
    }
  } catch (err) {
    showToast('Error al anular venta', 'error');
  }
}
