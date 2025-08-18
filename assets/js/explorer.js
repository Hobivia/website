// assets/js/explorer.js
// Branche le front sur l'endpoint Vercel /api/lodgings

export function formatPrice(value) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${value} €`;
  }
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchLodgings({ category = '', search = '', limit = 200, skip = 0 } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  params.set('limit', String(limit));
  params.set('skip', String(skip));

  const res = await fetch(`/api/lodgings?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json(); // { total, items: [...] }
}

function createObserver() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.remove('reveal-hidden');
        e.target.classList.add('reveal-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  return io;
}

function renderMarkers(map, items) {
  if (!map) return;
  if (map.__markers) {
    map.__markers.forEach(m => m.remove());
    map.__markers = [];
  }
  map.__markers = [];
  items.forEach(it => {
    if (!it.location || typeof it.location.lat !== 'number' || typeof it.location.lng !== 'number') return;
    const marker = L.marker([it.location.lat, it.location.lng]).addTo(map);
    marker.bindPopup(`<strong>${it.title}</strong><br>${it.location.city || ''} ${it.location.region || ''}`);
    map.__markers.push(marker);
  });
}

export async function renderLodgings(items) {
  const grid = document.querySelector('.grid-lodgings');
  if (!grid) return;

  grid.innerHTML = '';
  const io = createObserver();

  shuffle(items).forEach((it, idx) => {
    const side = idx % 2 === 0 ? 'left' : 'right';
    const el = document.createElement('article');
    el.className = 'card-lodging glass reveal-hidden';
    el.setAttribute('data-side', side);
    el.innerHTML = `
      <div class="media">
        ${it.images?.[0] ? `<img src="${it.images[0]}" alt="${it.title}" loading="lazy" decoding="async">` : ''}
      </div>
      <div class="body">
        <h3 class="h3">${it.title}</h3>
        <p class="muted">${it.shortDescription || ''}</p>
      </div>
      <div class="meta">
        <span class="badge price">À partir de ${formatPrice(it.priceFrom)}</span>
        ${it.bookingUrl ? `<a class="btn" href="${it.bookingUrl}" target="_blank" rel="noopener" aria-label="Réserver ${it.title}">Réserver</a>` : ''}
      </div>
    `;
    grid.appendChild(el);
    io.observe(el);
  });
}

function initMap() {
  const mapEl = document.getElementById('hbv-map');
  if (!mapEl) return null;
  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([46.8, 2.3], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  return map;
}

export async function initExplorer({ presetCategory = '' } = {}) {
  const map = initMap();

  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const resetBtn = document.getElementById('resetBtn');

  if (presetCategory) {
    const opt = [...categorySelect.options].find(o => o.value === presetCategory);
    if (opt) opt.selected = true;
  }

  async function load() {
    const category = categorySelect.value || '';
    const search = (searchInput.value || '').trim();
    const data = await fetchLodgings({ category, search, limit: 200, skip: 0 });
    renderLodgings(data.items || []);
    renderMarkers(map, data.items || []);
  }

  let t;
  searchInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(load, 250);
  });
  categorySelect.addEventListener('change', load);
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    categorySelect.value = presetCategory || '';
    load();
  });

  await load();
}
