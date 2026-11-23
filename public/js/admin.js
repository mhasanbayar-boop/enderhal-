let adminPassword = sessionStorage.getItem('ender_admin_pass') || '';
let cachedProducts = [];

// Tema Değiştirme
const themeBtn = document.getElementById('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ender_theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️ Açık Tema' : '🌙 Koyu Tema';
}
applyTheme(localStorage.getItem('ender_theme') || 'light');
themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#dc2626' : '#16a34a';
  t.style.display = 'block';
  setTimeout(() => (t.style.display = 'none'), 3000);
}

// Giriş İşlemleri
async function tryLogin(pass) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass })
  });

  if (res.ok) {
    adminPassword = pass;
    sessionStorage.setItem('ender_admin_pass', pass);
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-flex';
    loadAdminData();
  } else {
    document.getElementById('loginError').textContent = 'Şifre hatalı!';
  }
}

document.getElementById('loginBtn').addEventListener('click', () => {
  tryLogin(document.getElementById('passwordInput').value);
});
document.getElementById('passwordInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') tryLogin(e.target.value);
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('ender_admin_pass');
  location.reload();
});

if (adminPassword) tryLogin(adminPassword);

// Kayan Bar Canlı Önizleme
function updateMarqueePreview() {
  const bar = document.getElementById('previewMarquee');
  const track = document.getElementById('previewTrack');
  const bg = document.getElementById('marqueeBg').value;
  const color = document.getElementById('marqueeText').value;
  const speed = document.getElementById('marqueeSpeed').value;
  document.getElementById('speedLabel').textContent = speed;

  const texts = [
    document.getElementById('marqueeText1').value.trim(),
    document.getElementById('marqueeText2').value.trim(),
    document.getElementById('marqueeText3').value.trim()
  ].filter(Boolean);

  bar.style.backgroundColor = bg;
  bar.style.color = color;
  track.style.setProperty('--marquee-speed', `${speed}s`);

  const set = (texts.length ? texts : ['Örnek Duyuru Metni'])
    .map(t => `<span class="marquee-item">${t}</span><span class="marquee-sep">✦</span>`)
    .join('');

  const repeated = set.repeat(3);
  track.innerHTML = `<div class="marquee-group">${repeated}</div><div class="marquee-group">${repeated}</div>`;
}

['marqueeBg', 'marqueeText', 'marqueeSpeed', 'marqueeText1', 'marqueeText2', 'marqueeText3'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateMarqueePreview);
});

// Verileri Yükle
async function loadAdminData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  const s = data.settings;
  cachedProducts = data.products;

  document.getElementById('marqueeActive').value = String(s.marquee.active);
  document.getElementById('marqueeBg').value = s.marquee.bgColor;
  document.getElementById('marqueeText').value = s.marquee.textColor;
  document.getElementById('marqueeSpeed').value = s.marquee.speed;
  document.getElementById('marqueeText1').value = s.marquee.texts[0] || '';
  document.getElementById('marqueeText2').value = s.marquee.texts[1] || '';
  document.getElementById('marqueeText3').value = s.marquee.texts[2] || '';
  document.getElementById('whatsappNumber').value = s.whatsappNumber || '';
  document.getElementById('phone1').value = s.phone1 || '';
  document.getElementById('phone2').value = s.phone2 || '';

  updateMarqueePreview();
  renderAdminProducts();
}

// Ayarları Kaydet
document.getElementById('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    whatsappNumber: document.getElementById('whatsappNumber').value,
    phone1: document.getElementById('phone1').value,
    phone2: document.getElementById('phone2').value,
    marquee: {
      active: document.getElementById('marqueeActive').value === 'true',
      bgColor: document.getElementById('marqueeBg').value,
      textColor: document.getElementById('marqueeText').value,
      speed: Number(document.getElementById('marqueeSpeed').value),
      texts: [
        document.getElementById('marqueeText1').value,
        document.getElementById('marqueeText2').value,
        document.getElementById('marqueeText3').value
      ]
    }
  };

  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword
    },
    body: JSON.stringify(payload)
  });

  if (res.ok) showToast('Ayarlar başarıyla güncellendi!');
  else showToast('Kaydetme sırasında hata oluştu.', true);
});

// Ürün Ekle / Düzenle Gönderimi
document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const editId = document.getElementById('editProductId').value;
  const formData = new FormData();

  formData.append('name', document.getElementById('pName').value);
  formData.append('brand', document.getElementById('pBrand').value);
  formData.append('category', document.getElementById('pCategory').value);
  formData.append('size', document.getElementById('pSize').value);
  formData.append('price', document.getElementById('pPrice').value);
  formData.append('oldPrice', document.getElementById('pOldPrice').value);
  formData.append('badge', document.getElementById('pBadge').value);
  formData.append('description', document.getElementById('pDesc').value);

  const fileInput = document.getElementById('pImageFile');
  if (fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  const url = editId ? `/api/products/${editId}` : '/api/products';
  const method = editId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'x-admin-password': adminPassword },
    body: formData
  });

  if (res.ok) {
    showToast(editId ? 'Ürün güncellendi!' : 'Yeni ürün eklendi!');
    resetProductForm();
    loadAdminData();
  } else {
    const err = await res.json();
    showToast(err.error || 'İşlem başarısız.', true);
  }
});

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('productFormTitle').textContent = '➕ Yeni Ürün Ekle';
  document.getElementById('saveProductBtn').textContent = '✅ Ürünü Kaydet';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

document.getElementById('cancelEditBtn').addEventListener('click', resetProductForm);

function startEdit(id) {
  const p = cachedProducts.find(x => x.id === id);
  if (!p) return;

  document.getElementById('editProductId').value = p.id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pBrand').value = p.brand;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pSize').value = p.size || '';
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pOldPrice').value = p.oldPrice || '';
  document.getElementById('pBadge').value = p.badge || '';
  document.getElementById('pDesc').value = p.description || '';

  document.getElementById('productFormTitle').textContent = '✏️ Ürünü Düzenle: ' + p.name;
  document.getElementById('saveProductBtn').textContent = '💾 Değişiklikleri Kaydet';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  window.scrollTo({ top: document.getElementById('productFormTitle').offsetTop - 90, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (!confirm('Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?')) return;
  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword }
  });
  if (res.ok) {
    showToast('Ürün silindi.');
    loadAdminData();
  }
}

function renderAdminProducts() {
  document.getElementById('productCount').textContent = cachedProducts.length;
  const list = document.getElementById('adminProductList');

  if (cachedProducts.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">Henüz ürün eklenmemiş.</p>';
    return;
  }

  list.innerHTML = cachedProducts.map(p => `
    <div class="admin-product-row">
      <div class="admin-product-info">
        <img src="${p.image}" alt="${p.name}">
        <div>
          <strong>${p.name}</strong>
          <div style="font-size:0.85rem; color:var(--text-muted);">
            ${p.brand} • ${p.category} ${p.size ? '• ' + p.size : ''} • <strong>${p.price} ₺</strong>
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-outline" onclick="startEdit('${p.id}')">✏️ Düzenle</button>
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}