const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'store.json');
const ADMIN_USERNAME = process.env.SHOP_ADMIN_USERNAME || 'Ihsan Khan';
const ADMIN_PASSWORD = process.env.SHOP_ADMIN_PASSWORD || 'Ihsankhan2011!';
const sessions = new Map();

const defaultStore = {
  settings: {
    brandName: "Ihsan's Shop",
    eyebrow: 'Made with intention · shipped with care',
    heroTitle: 'Useful things, made by Ihsan.',
    heroText: 'A small collection of thoughtful goods for everyday life. Browse the first release below and check back as new pieces arrive.',
    heroButtonLabel: 'Shop the collection',
    announcement: 'Local orders are welcome · Call 512-429-8551 during business hours CST',
    phone: '512-429-8551',
    hours: 'Monday–Saturday · 9:00 AM–6:00 PM CST',
    accentColor: '#d96c4f',
    aboutTitle: 'Small-batch, genuinely useful.',
    aboutText: 'Every item here starts with a simple question: can this make an ordinary day a little better? The answer becomes a product, made in small batches and offered directly to you.',
    footerNote: 'Thoughtful goods from Ihsan, made for your everyday.',
  },
  admin: {
    username: ADMIN_USERNAME,
    passwordHash: null,
  },
  products: [
    {
      id: 'canvas-tote',
      name: 'Everyday Canvas Tote',
      description: 'A sturdy carry-all for errands, books, and days that do not fit in your pockets.',
      price: 28,
      category: 'Carry',
      inventory: 12,
      featured: true,
      active: true,
      placeholder: 'Tote / 01',
    },
    {
      id: 'cedar-desk-tray',
      name: 'Cedar Desk Tray',
      description: 'A warm, simple landing place for keys, notes, and the small things you reach for daily.',
      price: 36,
      category: 'Home',
      inventory: 8,
      featured: true,
      active: true,
      placeholder: 'Cedar / 02',
    },
    {
      id: 'linen-apron',
      name: 'Utility Linen Apron',
      description: 'Soft, durable linen with a roomy front pocket and an easy fit for making things.',
      price: 42,
      category: 'Wear',
      inventory: 6,
      featured: true,
      active: true,
      placeholder: 'Linen / 03',
    },
    {
      id: 'daily-notebook',
      name: 'Daily Notes Notebook',
      description: 'A quiet place for plans, sketches, lists, and the idea you do not want to lose.',
      price: 14,
      category: 'Paper',
      inventory: 24,
      featured: false,
      active: true,
      placeholder: 'Notes / 04',
    },
  ],
};

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function loadStore() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const store = {
      ...defaultStore,
      ...saved,
      settings: { ...defaultStore.settings, ...(saved.settings || {}) },
      admin: { ...defaultStore.admin, ...(saved.admin || {}) },
      products: Array.isArray(saved.products) && saved.products.length ? saved.products : defaultStore.products,
    };
    if (!store.admin.passwordHash) {
      store.admin.passwordHash = hash(ADMIN_PASSWORD);
      saveStore(store);
    }
    return store;
  } catch {
    const fresh = structuredClone(defaultStore);
    fresh.admin.passwordHash = hash(ADMIN_PASSWORD);
    saveStore(fresh);
    return fresh;
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2) + '\n');
}

let store = loadStore();

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function currentSession(req) {
  const token = parseCookies(req).shop_session;
  const session = token && sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  if (!currentSession(req)) {
    sendJson(res, 401, { error: 'Admin sign-in required.' });
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function cleanProduct(input, existing = {}) {
  return {
    id: existing.id || String(input.id || `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    name: String(input.name ?? existing.name ?? '').trim().slice(0, 100),
    description: String(input.description ?? existing.description ?? '').trim().slice(0, 500),
    price: Math.max(0, Number(input.price ?? existing.price ?? 0)),
    category: String(input.category ?? existing.category ?? 'General').trim().slice(0, 40),
    inventory: Math.max(0, Math.floor(Number(input.inventory ?? existing.inventory ?? 0))),
    featured: Boolean(input.featured ?? existing.featured),
    active: input.active !== undefined ? Boolean(input.active) : existing.active !== false,
    placeholder: String(input.placeholder ?? existing.placeholder ?? 'Image coming soon').trim().slice(0, 40),
  };
}

function safePublicPath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const resolved = path.resolve(PUBLIC_DIR, `.${requested}`);
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/store') {
    return sendJson(res, 200, { settings: store.settings });
  }
  if (req.method === 'GET' && url.pathname === '/api/products') {
    return sendJson(res, 200, store.products.filter((product) => product.active));
  }
  if (req.method === 'POST' && url.pathname === '/api/login') {
    try {
      const body = await readBody(req);
      if (String(body.username || '').trim() !== store.admin.username || hash(String(body.password || '')) !== store.admin.passwordHash) {
        return sendJson(res, 401, { error: 'That username or password is not correct.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { username: store.admin.username, expires: Date.now() + 8 * 60 * 60 * 1000 });
      return sendJson(res, 200, { ok: true, username: store.admin.username }, { 'Set-Cookie': `shop_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const token = parseCookies(req).shop_session;
    if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'shop_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const session = currentSession(req);
    return sendJson(res, session ? 200 : 401, session ? { authenticated: true, username: session.username } : { authenticated: false });
  }

  if (!url.pathname.startsWith('/api/admin/')) return false;
  if (!requireAdmin(req, res)) return true;

  if (req.method === 'GET' && url.pathname === '/api/admin/store') {
    return sendJson(res, 200, { settings: store.settings, username: store.admin.username });
  }
  if (req.method === 'PUT' && url.pathname === '/api/admin/store') {
    try {
      const body = await readBody(req);
      const allowed = ['brandName', 'eyebrow', 'heroTitle', 'heroText', 'heroButtonLabel', 'announcement', 'phone', 'hours', 'accentColor', 'aboutTitle', 'aboutText', 'footerNote'];
      for (const key of allowed) {
        if (body[key] !== undefined) store.settings[key] = String(body[key]).trim().slice(0, 500);
      }
      saveStore(store);
      return sendJson(res, 200, { settings: store.settings });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/products') {
    return sendJson(res, 200, store.products);
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/products') {
    try {
      const product = cleanProduct(await readBody(req));
      if (!product.name) return sendJson(res, 400, { error: 'Product name is required.' });
      store.products.unshift(product);
      saveStore(store);
      return sendJson(res, 201, product);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  const productMatch = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch) {
    const product = store.products.find((item) => item.id === productMatch[1]);
    if (!product) return sendJson(res, 404, { error: 'Product not found.' });
    if (req.method === 'PUT') {
      try {
        Object.assign(product, cleanProduct(await readBody(req), product));
        saveStore(store);
        return sendJson(res, 200, product);
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }
    if (req.method === 'DELETE') {
      store.products = store.products.filter((item) => item.id !== product.id);
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }
  }
  if (req.method === 'PUT' && url.pathname === '/api/admin/account') {
    try {
      const body = await readBody(req);
      if (hash(String(body.currentPassword || '')) !== store.admin.passwordHash) return sendJson(res, 400, { error: 'Current password is not correct.' });
      if (String(body.newPassword || '').length < 8) return sendJson(res, 400, { error: 'New password must be at least 8 characters.' });
      store.admin.passwordHash = hash(String(body.newPassword));
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  return sendJson(res, 404, { error: 'Admin route not found.' });
}

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (handled !== false) return;
    }
    if (url.pathname === '/admin.html' && !currentSession(req)) {
      return sendText(res, 302, '', { Location: '/login.html' });
    }
    const filePath = safePublicPath(url.pathname);
    if (!filePath) return sendText(res, 403, 'Forbidden');
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) return sendText(res, 404, 'Not found');
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

server.listen(PORT, () => {
  console.log(`Ihsan's Shop is running at http://localhost:${PORT}`);
});
