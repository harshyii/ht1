// Local Storage Keys
const CART_STORAGE_KEY = 'jk_cart';

// Configuration
const UPI_CONFIG = {
  vpa: '9050623210@sbi',
  name: 'Haryana Tools- JK Enterprises'
};

const BUSINESS_PHONE = '919050623210'; // WhatsApp recipient (+91)

// State Variables
let currentCart = [];
let appliedDiscountAmount = 0;
let qrCodeInstance = null;

// Escape HTML utility to prevent XSS
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
  loadCartData();
  renderOrderSummary();
  generateUpiQrCode();
});

// Load cart items from localStorage
function loadCartData() {
  try {
    currentCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
  } catch (err) {
    console.error('Failed to parse cart data:', err);
    currentCart = [];
  }

  if (currentCart.length === 0) {
    alert('Your cart is empty. Please add items before checking out.');
    window.location.href = './cart.html';
  }
}

// Compute cart calculations
function calculateCartTotals() {
  const subtotal = currentCart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  const discount = Math.min(appliedDiscountAmount, subtotal);
  const totalPayable = Math.max(0, subtotal - discount);

  return { subtotal, discount, totalPayable };
}

// Render Order Summary Sidebar Items
function renderOrderSummary() {
  const container = document.getElementById('checkout-items-list');
  if (!container) return;

  container.innerHTML = currentCart.map(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    const itemTotal = price * qty;

    return `
      <div class="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
        <div class="flex items-center gap-2.5 overflow-hidden pr-2">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="w-10 h-10 object-contain rounded-lg border bg-gray-50 p-1 flex-shrink-0" />
          <div class="truncate">
            <p class="font-bold text-gray-900 truncate">${escapeHtml(item.title)}</p>
            <p class="text-gray-500">Qty: ${qty} × ₹${price.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <span class="font-bold text-gray-900 flex-shrink-0">₹${itemTotal.toLocaleString('en-IN')}</span>
      </div>
    `;
  }).join('');

  updateTotalsDisplay();
}

// Update Totals UI elements
function updateTotalsDisplay() {
  const { subtotal, discount, totalPayable } = calculateCartTotals();

  const subtotalEl = document.getElementById('checkout-subtotal');
  const discountRow = document.getElementById('discount-row');
  const discountEl = document.getElementById('checkout-discount');
  const totalEl = document.getElementById('checkout-total');
  const qrAmountDisplay = document.getElementById('qr-amount-display');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  if (discountRow && discountEl) {
    if (discount > 0) {
      discountEl.textContent = `-₹${discount.toLocaleString('en-IN')}`;
      discountRow.classList.remove('hidden');
    } else {
      discountRow.classList.add('hidden');
    }
  }

  const formattedTotal = `₹${totalPayable.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.textContent = formattedTotal;
  if (qrAmountDisplay) qrAmountDisplay.textContent = formattedTotal;
}

// Generate UPI QR Code dynamically
function generateUpiQrCode() {
  const qrContainer = document.getElementById('qrcode-canvas');
  if (!qrContainer) return;

  const { totalPayable } = calculateCartTotals();
  const amountFormatted = totalPayable.toFixed(2);
  const note = encodeURIComponent(`JK Order ${Date.now().toString().slice(-6)}`);

  const upiUri = `upi://pay?pa=${UPI_CONFIG.vpa}&pn=${encodeURIComponent(UPI_CONFIG.name)}&am=${amountFormatted}&cu=INR&tn=${note}`;

  qrContainer.innerHTML = '';

  if (typeof QRCode !== 'undefined') {
    qrCodeInstance = new QRCode(qrContainer, {
      text: upiUri,
      width: 180,
      height: 180,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrContainer.innerHTML = `<p class="text-xs text-red-500 font-medium">Unable to render QR code.</p>`;
  }
}

/**
 * Embedded Coupon Engine
 * Evaluates target brand/category, minimum purchase, max discount caps, and expiry date.
 */
async function applyCouponCode() {
  const inputEl = document.getElementById('coupon-input');
  const msgEl = document.getElementById('coupon-msg');
  if (!inputEl) return;

  const code = inputEl.value.trim().toUpperCase();

  if (!code) {
    if (msgEl) {
      msgEl.textContent = 'Please enter a coupon code.';
      msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
    }
    return;
  }

  const { subtotal } = calculateCartTotals();

  try {
    // 1. Fetch coupons data from JSON
    const response = await fetch('./data/coupons.json');
    if (!response.ok) throw new Error('Coupons file could not be loaded.');
    const coupons = await response.json();

    // 2. Locate matching promo code
    const coupon = coupons.find(c => c.code.toUpperCase() === code);

    if (!coupon || coupon.status !== 'active') {
      if (msgEl) {
        msgEl.textContent = 'Invalid or inactive promo code.';
        msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
      }
      return;
    }

    // 3. Expiration Date Check
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      if (msgEl) {
        msgEl.textContent = 'This promo code has expired.';
        msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
      }
      return;
    }

    // 4. Target Checking & Eligible Subtotal Calculation
    let eligibleSubtotal = 0;

    if (coupon.target_type === 'all' || coupon.target_value === '*') {
      eligibleSubtotal = subtotal;
    } else {
      // Split target values by comma (e.g. "Eastman, JRSD" -> ["eastman", "jrsd"])
      const targets = String(coupon.target_value)
        .split(',')
        .map(t => t.trim().toLowerCase());

      currentCart.forEach(item => {
        const itemBrand = String(item.brand || '').toLowerCase();
        const itemCategory = String(item.category || item.brand || '').toLowerCase();
        const itemTitle = String(item.title || '').toLowerCase();

        const isMatch = targets.some(target => 
          itemBrand.includes(target) || 
          itemCategory.includes(target) || 
          itemTitle.includes(target)
        );

        if (isMatch) {
          eligibleSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }
      });
    }

    if (eligibleSubtotal === 0) {
      if (msgEl) {
        msgEl.textContent = `This code is only applicable for target items: "${coupon.target_value}".`;
        msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
      }
      return;
    }

    // 5. Minimum Purchase Requirement Check
    if (coupon.min_purchase && subtotal < coupon.min_purchase) {
      if (msgEl) {
        msgEl.textContent = `Minimum purchase of ₹${coupon.min_purchase} required for this code.`;
        msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
      }
      return;
    }

    // 6. Discount Calculation
    let calculatedDiscount = 0;
    if (coupon.discount_type === 'fixed') {
      calculatedDiscount = coupon.discount_value;
    } else if (coupon.discount_type === 'percentage') {
      calculatedDiscount = Math.round((eligibleSubtotal * coupon.discount_value) / 100);
    }

    // Cap at max_discount limit if set
    if (coupon.max_discount && calculatedDiscount > coupon.max_discount) {
      calculatedDiscount = coupon.max_discount;
    }

    // Set globally and update UI
    appliedDiscountAmount = Math.min(calculatedDiscount, subtotal);

    if (msgEl) {
      msgEl.textContent = `Code "${coupon.code}" applied! Saved ₹${appliedDiscountAmount}.`;
      msgEl.className = 'text-xs mt-2 text-green-600 font-bold block';
    }

    updateTotalsDisplay();
    generateUpiQrCode();

  } catch (err) {
    console.error('Error executing internal coupon engine:', err);
    if (msgEl) {
      msgEl.textContent = 'Failed to process coupon. Please try again.';
      msgEl.className = 'text-xs mt-2 text-red-600 font-semibold block';
    }
  }
}

// Order Submission Handler Placeholder
async function placeOrder() {
  const name = document.getElementById('cust-name')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const address = document.getElementById('cust-address')?.value.trim();
  const paymentRef = document.getElementById('payment-ref')?.value.trim();

  if (!name || !phone || !address) {
    alert('Please fill in all mandatory shipping address fields (*).');
    return;
  }

  if (!paymentRef || paymentRef.length < 6) {
    alert('Please enter a valid UPI Reference / Transaction UTR Number.');
    return;
  }

  console.log('Form validated. Ready to send order data.');
}