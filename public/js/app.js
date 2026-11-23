let allProducts = [];
let siteSettings = {};
let activeCategory = 'Tümü';

// Tema Yönetimi (Açık / Koyu)
const themeBtn = document.getElementById('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ender_theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️ Açık Tema' : '🌙 Koyu Tema';
}
applyTheme(localStorage.getItem('ender_theme') || 'light');

themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

document.getElementById('year').textContent = new Date().getFullYear();

// Kayan Barı Kesintisiz Oluştur
function renderMarquee(marquee) {
  const bar = document.getElementById('marqueeBar');
  const track = document.getElementById('marqueeTrack');
  const validTexts = (marquee?.texts || []).filter(t => t && t.trim() !== '');

  if (!marquee?.active || validTexts.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';
  bar.style.backgroundColor = marquee.bgColor || '#b91c1c';
  bar.style.color = marquee.textColor || '#ffffff';
  track.style.setProperty('--marquee-speed', `${marquee.speed || 25}s`);

  // Ekranı boşluksuz doldurmak için metin setini çoğaltıp iki eş gruba koyuyoruz
  const singleSet = validTexts
    .map(text => `<span class="marquee-item">${escapeHtml(text)}</span><span class="marquee-sep">✦</span>`)
    .join('');

  const repeatedGroup = singleSet.repeat(3);
  track.innerHTML = `<div class="marquee-group">${repeatedGroup}</div><div class="marquee-group" aria-hidden="true">${repeatedGroup}</div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function formatPrice(num) {
  return new Intl.NumberFormat('tr-TR').format(num) + ' ₺';
}

function buildWhatsAppUrl(product) {
  const phone = siteSettings.whatsappNumber || '905453480699';
  const msg = `Merhaba, web sitenizdeki "${product.name}" (${product.brand}${product.size ? ' - ' + product.size : ''}, ${formatPrice(product.price)}) ürünü hakkında bilgi almak ve sipariş vermek istiyorum.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function renderCategories() {
  const cats = ['Tümü', ...new Set(allProducts.map(p => p.category))];
  const container = document.getElementById('categoryTabs');
  container.innerHTML = cats.map(c => `
    <button class="tab-btn ${c === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
  `).join('');

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const grid = document.getElementById('productGrid');

  const filtered = allProducts.filter(p => {
    const matchCat = activeCategory === 'Tümü' || p.category === activeCategory;
    const matchSearch = !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      (p.size || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px;">Aramanıza uygun ürün bulunamadı.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <article class="product-card">
      <div class="product-img-wrap">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
        <span class="product-brand-tag">${escapeHtml(p.brand)}</span>
      </div>
      <div class="product-body">
        <div class="product-meta">${escapeHtml(p.category)}${p.size ? ' • ' + escapeHtml(p.size) : ''}</div>
        <h3 class="product-title">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="price-row">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.oldPrice && p.oldPrice > p.price ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        <a href="${buildWhatsAppUrl(p)}" target="_blank" rel="noopener" class="btn btn-wa">
          💬 WhatsApp'tan Sipariş Ver
        </a>
      </div>
    </article>
  `).join('');
}

document.getElementById('searchInput').addEventListener('input', renderProducts);

async function init() {
  const res = await fetch('/api/data');
  const data = await res.json();
  siteSettings = data.settings;
  allProducts = data.products;

  renderMarquee(siteSettings.marquee);

  const waDirect = `https://wa.me/${siteSettings.whatsappNumber || '905453480699'}?text=${encodeURIComponent('Merhaba, Ender Halı Çeyiz ürünleriyle ilgili bilgi almak istiyorum.')}`;
  document.getElementById('headerWaBtn').href = waDirect;
  document.getElementById('heroPhones').textContent = `${siteSettings.phone1} • ${siteSettings.phone2}`;
  document.getElementById('footerPhone1').textContent = `📞 ${siteSettings.phone1}`;
  document.getElementById('footerPhone1').href = `tel:${siteSettings.phone1.replace(/\s/g, '')}`;
  document.getElementById('footerPhone2').textContent = `📞 ${siteSettings.phone2}`;
  document.getElementById('footerPhone2').href = `tel:${siteSettings.phone2.replace(/\s/g, '')}`;

  renderCategories();
  renderProducts();
}

init();