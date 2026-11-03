const moneyCheckout = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const checkoutCart = JSON.parse(localStorage.getItem('ihsan_shop_cart') || '[]');
async function loadCheckout() {
  const [storeResponse, productResponse] = await Promise.all([fetch('/api/store'), fetch('/api/products')]);
  const settings = (await storeResponse.json()).settings;
  const products = await productResponse.json();
  document.getElementById('checkoutPhone').textContent = `${settings.phone} `;
  document.getElementById('checkoutPhone').insertAdjacentHTML('beforeend', '<span>↗</span>');
  document.getElementById('checkoutPhone').href = `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
  document.getElementById('checkoutHours').textContent = settings.hours;
  document.getElementById('year').textContent = new Date().getFullYear();
  const lines = checkoutCart.map((line) => ({ ...line, product: products.find((item) => item.id === line.id) })).filter((line) => line.product);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  document.getElementById('checkoutItems').innerHTML = lines.length ? lines.map(({ product, quantity }) => `<div class="checkout-item"><span>${product.name} × ${quantity}</span><span>${moneyCheckout(product.price * quantity)}</span></div>`).join('') : '<p class="small-note">Your bag is empty. <a href="/" class="text-link">Return to the shop.</a></p>';
  document.getElementById('checkoutTotal').textContent = moneyCheckout(total);
}
loadCheckout();
