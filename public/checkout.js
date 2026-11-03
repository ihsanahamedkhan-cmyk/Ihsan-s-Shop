const moneyCheckout = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const checkoutCart = JSON.parse(localStorage.getItem('ihsan_shop_cart') || '[]');
const checkoutThemeToggle = document.getElementById('checkoutThemeToggle');
document.documentElement.dataset.mode = localStorage.getItem('ihsan_shop_mode') || 'light';
function updateCheckoutThemeButton() { const dark = document.documentElement.dataset.mode === 'dark'; checkoutThemeToggle.innerHTML = dark ? '◐ <span>Light mode</span>' : '◐ <span>Dark mode</span>'; }
checkoutThemeToggle.addEventListener('click', () => { document.documentElement.dataset.mode = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark'; localStorage.setItem('ihsan_shop_mode', document.documentElement.dataset.mode); updateCheckoutThemeButton(); });
updateCheckoutThemeButton();
async function loadCheckout() {
  const [storeResponse, productResponse] = await Promise.all([fetch('/api/store'), fetch('/api/products')]);
  const settings = (await storeResponse.json()).settings;
  const products = await productResponse.json();
  document.documentElement.dataset.theme = settings.theme || 'gold';
  document.documentElement.style.setProperty('--accent', settings.accentColor || '#d96c4f');
  document.title = `${settings.brandName} — Checkout`;
  document.getElementById('checkoutBrand').textContent = settings.brandName;
  document.getElementById('checkoutFooterBrand').textContent = settings.brandName;
  ['checkoutEyebrow', 'checkoutTitle', 'checkoutText', 'checkoutSummaryTitle', 'checkoutEditLabel', 'checkoutNote'].forEach((id) => { const node = document.getElementById(id); if (node && settings[id]) node.textContent = settings[id]; });
  document.getElementById('checkoutBackLabel').textContent = settings.checkoutBackLabel || 'Back to shop';
  document.getElementById('checkoutFooterAdminLabel').textContent = settings.checkoutFooterAdminLabel || 'Admin sign-in';
  document.getElementById('checkoutTotalLabel').textContent = settings.cartTotalLabel || 'Estimated total';
  document.getElementById('checkoutPhone').textContent = `${settings.phone} `;
  document.getElementById('checkoutPhone').insertAdjacentHTML('beforeend', '<span>↗</span>');
  document.getElementById('checkoutPhone').href = `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
  document.getElementById('checkoutHours').textContent = settings.hours;
  document.getElementById('year').textContent = new Date().getFullYear();
  const lines = checkoutCart.map((line) => ({ ...line, product: products.find((item) => item.id === line.id) })).filter((line) => line.product);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  document.getElementById('checkoutItems').innerHTML = lines.length ? lines.map(({ product, quantity }) => `<div class="checkout-item"><span>${product.name} × ${quantity}</span><span>${moneyCheckout(product.price * quantity)}</span></div>`).join('') : `<p class="small-note">${settings.emptyCartText || 'Your bag is empty.'} <a href="/" class="text-link">Return to the shop.</a></p>`;
  document.getElementById('checkoutTotal').textContent = moneyCheckout(total);
}
loadCheckout();
