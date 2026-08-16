const CONFIG = {
  TAX_RATE: 0.18,
  FLAT_SHIPPING: 99,
  FREE_SHIPPING_THRESHOLD: 999
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  // Event delegation for cart interactions
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'update-qty') {
      updateQuantity(id, parseInt(target.dataset.change, 10));
    } else if (action === 'remove-item') {
      removeItem(id);
    } else if (action === 'add-featured') {
      addToCartFromFeatured(
        id, 
        target.dataset.title, 
        parseFloat(target.dataset.price) || 0, 
        target.dataset.image
      );
    }
  });

  // Sync cart across browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'jk_cart') renderCart();
  });
});

function calculateTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

  if (subtotal === 0) {
    return { subtotal: 0, tax: 0, shipping: 0, total: 0, isFreeShipping: false };
  }

  const tax = Math.round(subtotal * CONFIG.TAX_RATE);
  const isFreeShipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD;
  const shipping = isFreeShipping ? 0 : CONFIG.FLAT_SHIPPING;
  const total = subtotal + tax + shipping;

  return { subtotal, tax, shipping, total, isFreeShipping };
}

async function renderCart() {
  const container = document.getElementById('cart-items-container');
  const badgeEl = document.getElementById('cart-badge-count');
  
  const subtotalEl = document.getElementById('summary-subtotal');
  const taxEl = document.getElementById('summary-tax');
  const shippingEl = document.getElementById('summary-shipping');
  const totalEl = document.getElementById('summary-total');

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('jk_cart') || '[]');
  } catch (e) {
    cart = [];
  }

  const totalItemCount = cart.reduce((count, item) => count + (Number(item.quantity) || 0), 0);
  if (badgeEl) badgeEl.textContent = totalItemCount;

  const totals = calculateTotals(cart);

  if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
  if (taxEl) taxEl.textContent = `₹${totals.tax.toLocaleString('en-IN')}`;
  if (shippingEl) {
    shippingEl.textContent = totals.isFreeShipping ? 'FREE' : `₹${totals.shipping.toLocaleString('en-IN')}`;
    shippingEl.className = totals.isFreeShipping ? 'font-semibold text-green-600' : 'font-semibold text-gray-900';
  }
  if (totalEl) totalEl.textContent = `₹${totals.total.toLocaleString('en-IN')}`;

  if (!container) return;

  if (cart.length === 0) {
    await renderEmptyCartWithFeatured(container);
    return;
  }

  container.innerHTML = cart.map(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    const itemTotal = price * qty;
    const detailUrl = `/public/product.html?id=${encodeURIComponent(item.id)}`;

    return `
      <div class="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div class="flex items-center gap-4 w-full sm:w-auto">
          <a href="${detailUrl}" class="w-20 h-20 bg-gray-50 rounded-xl p-2 flex-shrink-0 flex items-center justify-center border">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="max-h-full max-w-full object-contain" />
          </a>
          <div>
            <a href="${detailUrl}" class="font-bold text-gray-900 text-sm sm:text-base hover:text-blue-600 transition line-clamp-2">
              ${escapeHtml(item.title)}
            </a>
            <p class="text-xs text-gray-400 mt-1">Unit Price: ₹${price.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
          <div class="flex items-center border rounded-lg bg-gray-50">
            <button data-action="update-qty" data-id="${escapeHtml(item.id)}" data-change="-1" class="px-3 py-1 font-bold text-sm text-gray-600 hover:text-black">-</button>
            <span class="px-3 py-1 text-xs font-bold min-w-[2rem] text-center bg-white border-x">${qty}</span>
            <button data-action="update-qty" data-id="${escapeHtml(item.id)}" data-change="1" class="px-3 py-1 font-bold text-sm text-gray-600 hover:text-black">+</button>
          </div>
          <div class="text-right min-w-[5rem]">
            <span class="block font-extrabold text-gray-900">₹${itemTotal.toLocaleString('en-IN')}</span>
            <button data-action="remove-item" data-id="${escapeHtml(item.id)}" class="text-[11px] font-semibold text-red-500 hover:text-red-700 transition">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function renderEmptyCartWithFeatured(container) {
  let featuredCardsHTML = '';

  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      const allProducts = await res.json();
      const selectedProducts = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 3);

      featuredCardsHTML = selectedProducts.map(product => {
        const imageUrl = product.thumbnail || (product.images && product.images[0]) || '';
        const detailUrl = `/public/product.html?id=${encodeURIComponent(product.id)}`;
        const price = Number(product.currentPrice) || 0;
        const productPrice = price ? `₹${price.toLocaleString('en-IN')}` : 'N/A';

        return `
          <div class="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <a href="${detailUrl}" class="block h-28 w-full bg-white rounded-lg p-2 mb-2 flex items-center justify-center overflow-hidden">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title)}" class="max-h-full max-w-full object-contain" />
              </a>
              <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">${escapeHtml(product.brand || '')}</span>
              <a href="${detailUrl}">
                <h4 class="font-bold text-gray-900 text-xs leading-snug line-clamp-2 hover:text-blue-600 transition mb-2">
                  ${escapeHtml(product.title)}
                </h4>
              </a>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-200 mt-auto">
              <span class="text-xs font-extrabold text-gray-900">${productPrice}</span>
              <button 
                data-action="add-featured"
                data-id="${escapeHtml(product.id)}"
                data-title="${escapeHtml(product.title)}"
                data-price="${price}"
                data-image="${escapeHtml(imageUrl)}"
                class="px-2.5 py-1 bg-yellow-500 text-gray-900 rounded-md text-[11px] font-bold hover:bg-yellow-400 transition"
              >
                + Add
              </button>
            </div>
          </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('Could not load featured items:', err);
  }

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
      <div class="text-5xl mb-3">🛒</div>
      <h3 class="text-xl font-bold text-gray-800 mb-1">Your cart is empty</h3>
      <p class="text-sm text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
      <a href="/catalog.html" class="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md">
        Explore Catalog
      </a>
    </div>

    ${featuredCardsHTML ? `
      <div class="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 class="text-sm font-extrabold text-gray-900 tracking-wider uppercase mb-4 flex items-center gap-2">
          ✨ Recommended For You
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          ${featuredCardsHTML}
        </div>
      </div>
    ` : ''}
  `;
}

function addToCartFromFeatured(id, title, price, image) {
  let cart = JSON.parse(localStorage.getItem('jk_cart') || '[]');
  const existingIndex = cart.findIndex(item => item.id === id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({ id, title, price, image, quantity: 1 });
  }

  localStorage.setItem('jk_cart', JSON.stringify(cart));
  renderCart();
}

function updateQuantity(id, change) {
  let cart = JSON.parse(localStorage.getItem('jk_cart') || '[]');
  const idx = cart.findIndex(i => i.id === id);
  if (idx > -1) {
    cart[idx].quantity += change;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    localStorage.setItem('jk_cart', JSON.stringify(cart));
    renderCart();
  }
}

function removeItem(id) {
  let cart = JSON.parse(localStorage.getItem('jk_cart') || '[]');
  cart = cart.filter(i => i.id !== id);
  localStorage.setItem('jk_cart', JSON.stringify(cart));
  renderCart();
}

function clearCart() {
  localStorage.removeItem('jk_cart');
  renderCart();
}