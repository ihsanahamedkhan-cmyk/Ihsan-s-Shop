const state = { products: [], settings: {}, cart: JSON.parse(localStorage.getItem('ihsan_shop_cart') || '[]'), category: 'All' };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const music = $('#backgroundMusic');
const themeToggle = $('#themeToggle');
const musicToggle = $('#musicToggle');
const musicMuteButton = $('#musicMuteButton');

document.documentElement.dataset.mode = localStorage.getItem('ihsan_shop_mode') || 'light';
music.volume = 0.16;
music.muted = localStorage.getItem('ihsan_shop_music_muted') === 'true';
music.autoplay = true;
function updateThemeToggle() {
  const dark = document.documentElement.dataset.mode === 'dark';
  themeToggle.innerHTML = dark ? '◐ <span>Light mode</span>' : '◐ <span>Dark mode</span>';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
function updateMusicControls() {
  const playing = !music.paused;
  musicToggle.innerHTML = playing ? '♫ <span>Pause music</span>' : '♫ <span>Play music</span>';
  musicMuteButton.disabled = !playing;
  musicMuteButton.textContent = music.muted ? 'Unmute' : 'Mute';
}
themeToggle.addEventListener('click', () => { document.documentElement.dataset.mode = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark'; localStorage.setItem('ihsan_shop_mode', document.documentElement.dataset.mode); updateThemeToggle(); });
musicToggle.addEventListener('click', async () => { if (music.paused) { try { await music.play(); } catch { musicToggle.innerHTML = '♫ <span>Tap to play</span>'; } } else music.pause(); updateMusicControls(); });
musicMuteButton.addEventListener('click', () => { music.muted = !music.muted; localStorage.setItem('ihsan_shop_music_muted', String(music.muted)); updateMusicControls(); });
music.addEventListener('play', updateMusicControls); music.addEventListener('pause', updateMusicControls);
updateThemeToggle(); updateMusicControls();
music.play().catch(() => { updateMusicControls(); });

async function loadShop() {
  const [storeResponse, productResponse] = await Promise.all([fetch('/api/store'), fetch('/api/products')]);
  state.settings = (await storeResponse.json()).settings;
  state.products = await productResponse.json();
  applySettings();
  renderCategories();
  renderProducts();
  renderCart();
}

function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = s.theme || 'gold';
  document.documentElement.dataset.mode = localStorage.getItem('ihsan_shop_mode') || 'light';
  document.documentElement.style.setProperty('--accent', s.accentColor || '#d96c4f');
  document.title = `${s.brandName} — Thoughtful goods for everyday life`;
  ['brandName', 'footerBrand'].forEach((id) => { const node = document.getElementById(id); if (node) node.textContent = s.brandName; });
  ['announcement', 'eyebrow', 'heroTitle', 'heroText', 'heroArtBackText', 'heroArtLabel', 'heroArtTitle', 'heroArtNote', 'navShop', 'navStory', 'navContact', 'shopEyebrow', 'shopTitle', 'shopNote', 'storyEyebrow', 'storyLink', 'aboutTitle', 'aboutText', 'contactEyebrow', 'contactTitle', 'contactText', 'hours', 'bagLabel', 'cartEyebrow', 'cartTitle', 'cartTotalLabel', 'cartNote', 'footerNote', 'footerShopLabel', 'footerStoryLabel', 'footerAdminLabel'].forEach((id) => { const node = document.getElementById(id); if (node) node.textContent = s[id] || ''; });
  const storyPosterText = $('#storyPosterText');
  if (storyPosterText) storyPosterText.textContent = s.storyPosterText || '';
  $('#heroButton').firstChild.textContent = `${s.heroButtonLabel || 'Shop the collection'} `;
  $('#checkoutButton').firstChild.textContent = `${s.checkoutButtonLabel || 'Continue to checkout'} `;
  $('#phoneLink').textContent = `${s.phone} `;
  $('#phoneLink').insertAdjacentHTML('beforeend', '<span>↗</span>');
  $('#phoneLink').href = `tel:${s.phone.replace(/[^\d+]/g, '')}`;
  if (s.heroImage && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(s.heroImage)) $('#heroArt .art-card-front').style.backgroundImage = `url('${s.heroImage}')`;
  if (s.storyImage && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(s.storyImage)) $('#storyPoster').style.backgroundImage = `url('${s.storyImage}')`;
  $('#year').textContent = new Date().getFullYear();
}

function renderCategories() {
  const categories = ['All', ...new Set(state.products.map((product) => product.category).filter(Boolean))];
  $('#categoryRow').innerHTML = categories.map((category) => `<button class="category-button ${category === state.category ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; renderCategories(); renderProducts(); }));
}

function renderProducts() {
  const visible = state.products.filter((product) => state.category === 'All' || product.category === state.category);
  $('#productGrid').innerHTML = visible.length ? visible.map((product, index) => `<article class="product-card"><div class="product-image ${product.image ? 'has-product-image' : ''}"${product.image ? ` style="background-image:url('${product.image}')"` : ''}><span class="product-index">${String(index + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}</span><span class="placeholder-label">${escapeHtml(product.placeholder || 'Image coming soon')}</span></div><div class="product-info"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)}</p></div><span class="product-price">${money(product.price)}</span></div><button class="add-button" data-add="${product.id}" ${product.inventory < 1 ? 'disabled' : ''}>${product.inventory < 1 ? 'Sold out' : 'Add to bag'} <span>＋</span></button></article>`).join('') : '<div class="loading-card">No products in this collection yet.</div>';
  document.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add)));
}

function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, product.inventory);
  else state.cart.push({ id, quantity: 1 });
  saveCart(); renderCart(); openCart();
}

function saveCart() { localStorage.setItem('ihsan_shop_cart', JSON.stringify(state.cart)); }
function cartProducts() { return state.cart.map((line) => ({ ...line, product: state.products.find((product) => product.id === line.id) })).filter((line) => line.product); }
function renderCart() {
  const lines = cartProducts();
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  $('#cartCount').textContent = count;
  $('#cartTotal').textContent = money(total);
  $('#checkoutButton').style.opacity = lines.length ? '1' : '.45';
  $('#checkoutButton').style.pointerEvents = lines.length ? 'auto' : 'none';
  $('#cartItems').innerHTML = lines.length ? lines.map(({ product, quantity }) => `<div class="cart-item"><div class="cart-item-image ${product.image ? 'has-product-image' : ''}"${product.image ? ` style="background-image:url('${product.image}')"` : ''}>${product.image ? '' : escapeHtml(product.placeholder || 'Soon')}</div><div><p class="cart-item-name">${escapeHtml(product.name)}</p><span class="cart-item-meta">${money(product.price)} each</span><div class="qty-controls"><button data-qty="-1" data-id="${product.id}" aria-label="Decrease quantity">−</button><span>${quantity}</span><button data-qty="1" data-id="${product.id}" aria-label="Increase quantity">＋</button></div></div><span class="cart-item-price">${money(product.price * quantity)}</span></div>`).join('') : `<p class="empty-cart">${escapeHtml(state.settings.emptyCartText || 'Your bag is waiting for something good. Add a product from the collection to begin.')}</p>`;
  document.querySelectorAll('[data-qty]').forEach((button) => button.addEventListener('click', () => updateQuantity(button.dataset.id, Number(button.dataset.qty))));
}
function updateQuantity(id, change) { const line = state.cart.find((item) => item.id === id); const product = state.products.find((item) => item.id === id); if (!line || !product) return; line.quantity += change; if (line.quantity <= 0) state.cart = state.cart.filter((item) => item.id !== id); else line.quantity = Math.min(line.quantity, product.inventory); saveCart(); renderCart(); }
function openCart() { $('#cartDrawer').classList.add('open'); $('#cartOverlay').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
function closeCart() { $('#cartDrawer').classList.remove('open'); $('#cartOverlay').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

$('#cartButton').addEventListener('click', openCart); $('#closeCart').addEventListener('click', closeCart); $('#cartOverlay').addEventListener('click', closeCart);
loadShop().catch(() => { $('#productGrid').innerHTML = '<div class="loading-card">The shop is taking a quick break. Please refresh in a moment.</div>'; });
