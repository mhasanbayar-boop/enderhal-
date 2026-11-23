const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ender2026';

// Gerekli klasörleri otomatik oluştur
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const dbFile = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Başlangıç verileri (İlk çalıştırmada otomatik yüklenir)
const defaultData = {
  settings: {
    storeName: 'ENDER HALI & ÇEYİZ MAĞAZASI',
    whatsappNumber: '905453480699',
    phone1: '0545 348 0699',
    phone2: '0542 384 9722',
    marquee: {
      active: true,
      bgColor: '#b91c1c',
      textColor: '#ffffff',
      speed: 25, // Saniye (küçük değer = daha hızlı)
      texts: [
        'KREDİ KARTINA 6 AYA VARAN TAKSİT İMKANI!',
        'ARTEMIS • MERİNOS • DİNARSU • FLORA • AYSER • NEXUS YETKİLİ BAYİSİ',
        'YENİ SEZON HALI VE ÇEYİZ SETLERİNDE BÜYÜK İNDİRİM FIRSATI!'
      ]
    }
  },
  products: [
    {
      id: 'p1',
      name: 'Merinos Royal Salon Halısı',
      brand: 'Merinos',
      category: 'Halı',
      size: '200 x 290 cm (6 m²)',
      oldPrice: 8500,
      price: 6750,
      badge: 'İndirim',
      description: 'Yumuşak dokulu, tozuma yapmayan, leke tutmaz özel seri modern salon halısı.',
      image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'p2',
      name: 'Artemis Vintage Dokuma Halı',
      brand: 'Artemis',
      category: 'Halı',
      size: '160 x 230 cm (4 m²)',
      oldPrice: 6200,
      price: 4990,
      badge: 'Yeni Sezon',
      description: 'Klasik ve modern çizgileri birleştiren, pamuk tabanlı yüksek kalite dokuma.',
      image: 'https://images.unsplash.com/photo-1575414003591-ece8d0416c7a?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'p3',
      name: 'Lüks 12 Parça Gelin Çeyiz Seti',
      brand: 'Özel Seri',
      category: 'Çeyiz Seti',
      size: 'Çift Kişilik',
      oldPrice: 11500,
      price: 8950,
      badge: 'Kampanya',
      description: 'Fransız güpürlü yatak örtüsü, saten nevresim takımı, battaniye ve dekoratif kırlentler dahil.',
      image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
    }
  ]
};

function readDB() {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
}

// Fotoğraf Yükleme (Multer) Ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'urun-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // Maksimum 8 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const isOk = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (isOk) cb(null, true);
    else cb(new Error('Sadece JPG, PNG ve WEBP formatında görsel yükleyebilirsiniz.'));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin Yetkilendirme Middleware
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-password'];
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
  }
  next();
}

// --- API ROTALARI ---

// Tüm verileri getir (Mağaza ve Admin için)
app.get('/api/data', (req, res) => {
  res.json(readDB());
});

// Admin Giriş Kontrolü
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Şifre hatalı!' });
  }
});

// Ayarları Güncelle (Kayan Bar, WhatsApp Numarası, Mağaza Bilgileri)
app.put('/api/settings', requireAdmin, (req, res) => {
  const db = readDB();
  const { storeName, whatsappNumber, phone1, phone2, marquee } = req.body;

  db.settings = {
    storeName: storeName || db.settings.storeName,
    whatsappNumber: (whatsappNumber || '').replace(/\D/g, ''),
    phone1: phone1 || db.settings.phone1,
    phone2: phone2 || db.settings.phone2,
    marquee: {
      active: Boolean(marquee?.active),
      bgColor: marquee?.bgColor || '#b91c1c',
      textColor: marquee?.textColor || '#ffffff',
      speed: Math.max(5, Math.min(80, Number(marquee?.speed) || 25)),
      texts: [
        (marquee?.texts?.[0] || '').trim(),
        (marquee?.texts?.[1] || '').trim(),
        (marquee?.texts?.[2] || '').trim()
      ]
    }
  };

  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// Yeni Ürün Ekle
app.post('/api/products', requireAdmin, upload.single('image'), (req, res) => {
  const db = readDB();
  const { name, brand, category, size, oldPrice, price, badge, description, imageUrl } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Ürün adı ve fiyat zorunludur.' });
  }

  const imagePath = req.file
    ? '/uploads/' + req.file.filename
    : (imageUrl || 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=800&q=80');

  const newProduct = {
    id: 'p-' + Date.now(),
    name: name.trim(),
    brand: (brand || 'Ender Özel').trim(),
    category: (category || 'Halı').trim(),
    size: (size || '').trim(),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    price: Number(price),
    badge: (badge || '').trim(),
    description: (description || '').trim(),
    image: imagePath
  };

  db.products.unshift(newProduct);
  writeDB(db);
  res.json({ success: true, product: newProduct });
});

// Ürün Düzenle
app.put('/api/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ürün bulunamadı.' });

  const oldProduct = db.products[idx];
  const { name, brand, category, size, oldPrice, price, badge, description, imageUrl } = req.body;

  let finalImage = oldProduct.image;
  if (req.file) {
    // Eski yerel fotoğraf varsa temizle
    if (oldProduct.image && oldProduct.image.startsWith('/uploads/')) {
      const oldFile = path.join(__dirname, 'public', oldProduct.image);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    finalImage = '/uploads/' + req.file.filename;
  } else if (imageUrl && imageUrl.trim() !== '') {
    finalImage = imageUrl.trim();
  }

  db.products[idx] = {
    ...oldProduct,
    name: (name || oldProduct.name).trim(),
    brand: (brand || oldProduct.brand).trim(),
    category: (category || oldProduct.category).trim(),
    size: (size !== undefined ? size : oldProduct.size).trim(),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    price: Number(price || oldProduct.price),
    badge: (badge !== undefined ? badge : oldProduct.badge).trim(),
    description: (description !== undefined ? description : oldProduct.description).trim(),
    image: finalImage
  };

  writeDB(db);
  res.json({ success: true, product: db.products[idx] });
});

// Ürün Sil
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ürün bulunamadı.' });

  const [removed] = db.products.splice(idx, 1);
  if (removed.image && removed.image.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, 'public', removed.image);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  writeDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Ender Halı Çeyiz sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`Yönetim Paneli: http://localhost:${PORT}/admin.html (Şifre: ${ADMIN_PASSWORD})`);
});