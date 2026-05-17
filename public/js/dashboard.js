// ══════════════════════════════════════════════════════════════
// Dashboard Controller - Lunele Admin
// ══════════════════════════════════════════════════════════════

let dashboardData = null;
let chartInstances = {};
let investmentFilters = { categories: [], tags: [] };

// ─── Helpers ───
function fmtMoney(v) {
  return '$' + Math.round(v || 0).toLocaleString('es-CO');
}
function fmtNum(v) {
  return (v || 0).toLocaleString('es-CO');
}
const CHART_COLORS = [
  '#818cf8','#34d399','#f472b6','#fbbf24','#38bdf8',
  '#fb923c','#a78bfa','#4ade80','#f87171','#22d3ee',
  '#e879f9','#facc15'
];

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => loadDashboard());

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const json = await res.json();
    if (!json.success) throw new Error('API error');
    dashboardData = json.data;
    renderKPIs();
    renderInvestmentFilters();
    renderCharts();
    renderAlerts();
    renderRecent();
    loadDashboardSales();
    document.getElementById('lastUpdate').textContent =
      new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

// ─── KPIs ───
function renderKPIs() {
  const k = dashboardData.kpis;
  animateValue('kpi-total-products', k.totalProducts);
  animateValue('kpi-total-stock', k.totalStock);
  animateValue('kpi-categories', k.totalCategories);
  animateValue('kpi-users', k.totalUsers);
  document.getElementById('kpi-investment').textContent = fmtMoney(k.totalInvestment);
  document.getElementById('kpi-sale-value').textContent = fmtMoney(k.totalSaleValue);
  document.getElementById('kpi-potential-profit').textContent = fmtMoney(k.potentialProfit);
  document.getElementById('kpi-avg-margin').textContent = k.avgMargin.toFixed(1);
}

function animateValue(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 600, start = 0, startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(Math.round(start + (end - start) * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── Investment Filter ───
function toggleInvestmentFilter() {
  document.getElementById('investmentFilterPanel').classList.toggle('hidden');
}

function renderInvestmentFilters() {
  const cats = dashboardData.charts.categories;
  const tags = dashboardData.charts.tags;
  const catC = document.getElementById('inv-filter-categories');
  const tagC = document.getElementById('inv-filter-tags');

  catC.innerHTML = cats.map(c =>
    `<button onclick="toggleInvFilter('categories','${c._id}')" data-id="${c._id}" class="inv-cat-chip text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400">${c.name}</button>`
  ).join('') || '<span class="text-xs text-slate-600">Sin categorías</span>';

  tagC.innerHTML = tags.map(t =>
    `<button onclick="toggleInvFilter('tags','${t._id}')" data-id="${t._id}" class="inv-tag-chip text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400">
      <span class="inline-block w-2 h-2 rounded-full mr-1" style="background:${t.color}"></span>${t.name}
    </button>`
  ).join('') || '<span class="text-xs text-slate-600">Sin etiquetas</span>';
}

function toggleInvFilter(type, id) {
  const idx = investmentFilters[type].indexOf(id);
  if (idx > -1) investmentFilters[type].splice(idx, 1);
  else investmentFilters[type].push(id);

  // Update chip UI
  const cls = type === 'categories' ? 'inv-cat-chip' : 'inv-tag-chip';
  document.querySelectorAll(`.${cls}`).forEach(btn => {
    const active = investmentFilters[type].includes(btn.dataset.id);
    btn.className = btn.className.replace(/bg-\S+/g, '').replace(/border-\S+/g, '').replace(/text-\S+/g, '');
    btn.classList.add('text-[10px]','font-bold','px-2.5','py-1','rounded-lg','border','transition-all',
      ...(active
        ? ['bg-indigo-500/20','border-indigo-500/60','text-indigo-300']
        : ['bg-slate-800/50','border-slate-700/50','text-slate-400','hover:border-indigo-500/50','hover:text-indigo-400']));
  });

  recalcInvestment();
}

function recalcInvestment() {
  // Fetch all products and filter client-side
  fetch('/api/inventory').then(r => r.json()).then(json => {
    if (!json.success) return;
    let products = json.data;
    const { categories: fc, tags: ft } = investmentFilters;

    if (fc.length > 0) {
      products = products.filter(p => p.category && fc.includes(p.category._id || p.category));
    }
    if (ft.length > 0) {
      products = products.filter(p => p.tag && ft.includes(p.tag._id || p.tag));
    }

    const total = products.reduce((s, p) => s + ((p.purchasePrice||0) * (p.stock||0)), 0);
    document.getElementById('kpi-investment').textContent = fmtMoney(total);

    const label = document.getElementById('investment-filter-label');
    if (fc.length || ft.length) {
      const parts = [];
      if (fc.length) parts.push(`${fc.length} cat.`);
      if (ft.length) parts.push(`${ft.length} etiq.`);
      label.textContent = `Filtrado: ${parts.join(', ')}`;
    } else {
      label.textContent = 'Todos los productos';
    }
  });
}

// ─── Charts ───
function renderCharts() {
  renderCategoryPie('investment');
  renderTopProducts('investment');
  renderMarginDoughnut();
  renderCatCompare();
}

function destroyChart(name) {
  if (chartInstances[name]) { chartInstances[name].destroy(); chartInstances[name] = null; }
}

function switchCategoryChartMode(mode) {
  document.querySelectorAll('#cat-mode-investment,#cat-mode-count,#cat-mode-stock').forEach(b => b.classList.remove('active'));
  document.getElementById(`cat-mode-${mode}`).classList.add('active');
  renderCategoryPie(mode);
}

function renderCategoryPie(mode) {
  const cats = dashboardData.charts.categories;
  const canvas = document.getElementById('categoryPieChart');
  const empty = document.getElementById('categoryPieEmpty');

  if (!cats.length) { canvas.style.display='none'; empty.classList.remove('hidden'); return; }
  canvas.style.display='block'; empty.classList.add('hidden');

  const labels = cats.map(c => c.name);
  let data, label;
  if (mode === 'investment') { data = cats.map(c => c.totalCost); label = 'Inversión ($)'; }
  else if (mode === 'count') { data = cats.map(c => c.count); label = 'Productos'; }
  else { data = cats.map(c => c.totalStock); label = 'Unidades'; }

  destroyChart('categoryPie');
  chartInstances.categoryPie = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data, label,
        backgroundColor: CHART_COLORS.slice(0, cats.length),
        borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11, weight: 600 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 } },
        tooltip: {
          backgroundColor: 'rgba(30,41,59,0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
          borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 12, padding: 12,
          callbacks: { label: ctx => mode === 'investment' ? `${ctx.label}: ${fmtMoney(ctx.raw)}` : `${ctx.label}: ${fmtNum(ctx.raw)}` }
        }
      }
    }
  });
}

function switchTopProductsMode(mode) {
  document.querySelectorAll('#top-mode-investment,#top-mode-margin').forEach(b => b.classList.remove('active'));
  document.getElementById(`top-mode-${mode}`).classList.add('active');
  renderTopProducts(mode);
}

function renderTopProducts(mode) {
  const rankings = dashboardData.rankings;
  const items = mode === 'investment' ? rankings.topValue : rankings.topMargin;
  const canvas = document.getElementById('topProductsChart');
  const empty = document.getElementById('topProductsEmpty');

  if (!items || !items.length) { canvas.style.display='none'; empty.classList.remove('hidden'); return; }
  canvas.style.display='block'; empty.classList.add('hidden');

  const labels = items.map(p => p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name);
  let data, label, color;
  if (mode === 'investment') {
    data = items.map(p => p.investmentValue || ((p.purchasePrice||0)*(p.stock||0)));
    label = 'Inversión ($)'; color = '#fbbf24';
  } else {
    data = items.map(p => p.margin ? Math.round(p.margin * 10) / 10 : 0);
    label = 'Margen (%)'; color = '#34d399';
  }

  destroyChart('topProducts');
  chartInstances.topProducts = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, label, backgroundColor: color + '33', borderColor: color, borderWidth: 2, borderRadius: 8, barThickness: 28 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => mode === 'investment' ? fmtMoney(v) : v + '%' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11, weight: 600 } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30,41,59,0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
          borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 12, padding: 12,
          callbacks: { label: ctx => mode === 'investment' ? fmtMoney(ctx.raw) : ctx.raw + '%' }
        }
      }
    }
  });
}

function renderMarginDoughnut() {
  const md = dashboardData.charts.marginDistribution;
  const canvas = document.getElementById('marginDoughnutChart');
  const empty = document.getElementById('marginChartEmpty');
  const hasData = md.data.some(v => v > 0);

  if (!hasData) { canvas.style.display='none'; empty.classList.remove('hidden'); return; }
  canvas.style.display='block'; empty.classList.add('hidden');

  const colors = ['#f87171','#fb923c','#fbbf24','#34d399','#22d3ee'];
  destroyChart('marginDoughnut');
  chartInstances.marginDoughnut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: md.labels,
      datasets: [{ data: md.data, backgroundColor: colors, borderColor: 'rgba(15,23,42,0.8)', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11, weight: 600 }, padding: 10, usePointStyle: true } },
        tooltip: {
          backgroundColor: 'rgba(30,41,59,0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
          borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 12,
          callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} productos` }
        }
      }
    }
  });
}

function renderCatCompare() {
  const cats = dashboardData.charts.categories;
  const canvas = document.getElementById('catCompareChart');
  const empty = document.getElementById('catCompareEmpty');

  if (!cats.length) { canvas.style.display='none'; empty.classList.remove('hidden'); return; }
  canvas.style.display='block'; empty.classList.add('hidden');

  destroyChart('catCompare');
  chartInstances.catCompare = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: cats.map(c => c.name.length > 12 ? c.name.substring(0, 12) + '…' : c.name),
      datasets: [
        { label: 'Inversión', data: cats.map(c => c.totalCost), backgroundColor: '#fbbf2444', borderColor: '#fbbf24', borderWidth: 2, borderRadius: 6 },
        { label: 'Valor Venta', data: cats.map(c => c.totalSaleValue), backgroundColor: '#34d39944', borderColor: '#34d399', borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10, weight: 600 } } },
        y: { grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => fmtMoney(v) } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11, weight: 600 }, usePointStyle: true, padding: 16 } },
        tooltip: {
          backgroundColor: 'rgba(30,41,59,0.95)', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 12,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtMoney(ctx.raw)}` }
        }
      }
    }
  });
}

// ─── Alerts ───
function renderAlerts() {
  const { lowStock, outOfStock } = dashboardData.alerts;
  const container = document.getElementById('stock-alerts-container');
  const all = [...outOfStock.map(p => ({...p, type:'out'})), ...lowStock.map(p => ({...p, type:'low'}))];

  document.getElementById('alert-count').textContent = all.length;

  if (!all.length) { document.getElementById('no-alerts').style.display = 'flex'; return; }
  document.getElementById('no-alerts').style.display = 'none';

  container.innerHTML = all.map(p => {
    const isOut = p.type === 'out';
    const catName = p.category?.name || 'Sin categoría';
    return `<div class="flex items-center gap-3 p-3 rounded-xl ${isOut ? 'bg-red-500/5 border border-red-500/10' : 'bg-amber-500/5 border border-amber-500/10'} transition-all hover:translate-x-1">
      <div class="w-8 h-8 rounded-lg ${isOut ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'} flex items-center justify-center text-sm shrink-0">
        <i class="ph-fill ${isOut ? 'ph-x-circle' : 'ph-warning'}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white truncate">${p.name}</p>
        <p class="text-[10px] text-slate-500">${catName}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-xs font-bold ${isOut ? 'text-red-400' : 'text-amber-400'}">${p.stock} uds</p>
        <p class="text-[10px] text-slate-600">mín: ${p.minStock}</p>
      </div>
    </div>`;
  }).join('');
}

// ─── Recent ───
function renderRecent() {
  const items = dashboardData.recent;
  const container = document.getElementById('recent-activity-container');

  if (!items || !items.length) { document.getElementById('no-recent').style.display = 'flex'; return; }
  document.getElementById('no-recent').style.display = 'none';

  container.innerHTML = items.map(p => {
    const catName = p.category?.name || 'Sin categoría';
    const date = new Date(p.createdAt);
    const timeAgo = getTimeAgo(date);
    return `<div class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/20 transition-all hover:bg-slate-800/40 hover:translate-x-1">
      <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm shrink-0">
        <i class="ph-fill ph-package"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white truncate">${p.name}</p>
        <p class="text-[10px] text-slate-500">${catName} · ${p.stock} uds</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-[10px] font-semibold text-indigo-400">${fmtMoney(p.salePrice)}</p>
        <p class="text-[10px] text-slate-600">${timeAgo}</p>
      </div>
    </div>`;
  }).join('');
}

function getTimeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'Ahora';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

// ─── Sales KPIs (Dashboard) ───
async function loadDashboardSales() {
  try {
    const res = await fetch('/api/sales/stats');
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;

    document.getElementById('dash-sales-today').textContent = fmtMoney(d.today.total);
    document.getElementById('dash-sales-today-count').textContent = `${d.today.count} transaccion${d.today.count !== 1 ? 'es' : ''}`;
    document.getElementById('dash-sales-today-profit').innerHTML = `<i class="ph ph-trend-up text-sm"></i> Ganancia: ${fmtMoney(d.today.profit)}`;

    document.getElementById('dash-sales-week').textContent = fmtMoney(d.week.total);
    document.getElementById('dash-sales-week-count').textContent = `${d.week.count} transaccion${d.week.count !== 1 ? 'es' : ''}`;
    document.getElementById('dash-sales-week-profit').innerHTML = `<i class="ph ph-trend-up text-sm"></i> Ganancia: ${fmtMoney(d.week.profit)}`;

    document.getElementById('dash-sales-month').textContent = fmtMoney(d.month.total);
    document.getElementById('dash-sales-month-count').textContent = `${d.month.count} transaccion${d.month.count !== 1 ? 'es' : ''}`;
    document.getElementById('dash-sales-month-profit').innerHTML = `<i class="ph ph-trend-up text-sm"></i> Ganancia: ${fmtMoney(d.month.profit)}`;
  } catch (e) {
    console.error('Sales KPI load error:', e);
  }
}