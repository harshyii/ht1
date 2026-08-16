// Local Storage Keys
const CART_STORAGE_KEY = 'jk_cart';

// Configuration
const UPI_CONFIG = {
  vpa: '9050623210@sbi',
  name: 'Haryana Tools- JK Enterprises'
};

const BUSINESS_PHONE = '919050623210'; // WhatsApp recipient (+91)
const COD_SURCHARGE_RATE = 0.05;      // 5% COD Surcharge

// State Variables
let currentCart = [];
let appliedDiscountAmount = 0;
let selectedPaymentMethod = 'upi'; // 'upi' or 'cod'
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
  setupPaymentMethodListeners();
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

// Compute cart calculations including optional 5% COD surcharge
function calculateCartTotals() {
  const subtotal = currentCart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  const discount = Math.min(appliedDiscountAmount, subtotal);
  const netSubtotal = Math.max(0, subtotal - discount);

  // Apply 5% surcharge ONLY if COD is selected
  const codSurcharge = (selectedPaymentMethod === 'cod') ? Math.round(netSubtotal * COD_SURCHARGE_RATE) : 0;
  const totalPayable = netSubtotal + codSurcharge;

  return { subtotal, discount, codSurcharge, totalPayable };
}

// Set up payment method event listeners
function setupPaymentMethodListeners() {
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedPaymentMethod = e.target.value;

      const utrContainer = document.getElementById('utr-field-container');
      const qrBox = document.getElementById('qrcode-canvas')?.closest('.bg-white');

      if (selectedPaymentMethod === 'cod') {
        if (utrContainer) utrContainer.classList.add('hidden');
        if (qrBox) qrBox.classList.add('opacity-40', 'pointer-events-none');
      } else {
        if (utrContainer) utrContainer.classList.remove('hidden');
        if (qrBox) qrBox.classList.remove('opacity-40', 'pointer-events-none');
        generateUpiQrCode();
      }

      updateTotalsDisplay();
    });
  });
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
  const { subtotal, discount, codSurcharge, totalPayable } = calculateCartTotals();

  const subtotalEl = document.getElementById('checkout-subtotal');
  const discountRow = document.getElementById('discount-row');
  const discountEl = document.getElementById('checkout-discount');
  const codRow = document.getElementById('cod-surcharge-row');
  const codEl = document.getElementById('checkout-cod-surcharge');
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

  if (codRow && codEl) {
    if (codSurcharge > 0) {
      codEl.textContent = `+₹${codSurcharge.toLocaleString('en-IN')}`;
      codRow.classList.remove('hidden');
    } else {
      codRow.classList.add('hidden');
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

// Order Submission Handler
async function placeOrder() {
  const name = document.getElementById('cust-name')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const email = document.getElementById('cust-email')?.value.trim();
  const address = document.getElementById('cust-address')?.value.trim();
  const city = document.getElementById('cust-city')?.value.trim();
  const state = document.getElementById('cust-state')?.value.trim();
  const pincode = document.getElementById('cust-pincode')?.value.trim();
  const paymentRef = document.getElementById('payment-ref')?.value.trim();

  // 1. Mandatory Address Validation
  if (!name || !phone || !address || !city || !state || !pincode) {
    alert('Please fill in all mandatory shipping address fields (*).');
    return;
  }

  // 2. Validate UTR strictly IF UPI is selected
  if (selectedPaymentMethod === 'upi') {
    if (!paymentRef || paymentRef.length < 6) {
      alert('Please enter a valid UPI Reference / Transaction UTR Number.');
      return;
    }
  }

  // 3. Generate Order ID & Capture Order Object
  const generatedOrderId = `JK-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderTimestamp = new Date().toISOString();
  const { subtotal, discount, codSurcharge, totalPayable } = calculateCartTotals();

  const orderRecord = {
    orderId: generatedOrderId,
    orderDate: orderTimestamp,
    customer: {
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode
    },
    payment: {
      method: selectedPaymentMethod,
      utrReference: selectedPaymentMethod === 'upi' ? paymentRef : 'Pay on Delivery (COD)'
    },
    items: currentCart,
    pricing: {
      subtotal,
      discount,
      codSurcharge,
      totalPayable
    }
  };

  // 4. Store Order Data for Success / Receipt Page
  try {
    localStorage.setItem('jk_last_order', JSON.stringify(orderRecord));
  } catch (e) {
    console.error('Failed to save order record:', e);
  }

  // 5. Build WhatsApp Message Payload
  const itemsText = currentCart.map((item, index) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return `${index + 1}. *${item.title}*\n   Qty: ${qty} | Price: ₹${(price * qty).toLocaleString('en-IN')}`;
  }).join('\n');

  const paymentText = selectedPaymentMethod === 'cod'
    ? `💵 *Payment Method:* Pay on Delivery (COD)\n➕ *COD Surcharge (5%):* ₹${codSurcharge.toLocaleString('en-IN')}`
    : `💵 *Payment Method:* Prepaid (UPI)\n💳 *UPI UTR / Ref No:* ${paymentRef}`;

  const orderMessage = 
`🛒 *NEW ORDER RECEIVED - HARYANA TOOLS*
🆔 *Order ID:* ${generatedOrderId}
----------------------------------------
*Customer Details:*
👤 *Name:* ${name}
📞 *Phone:* ${phone}
📍 *Address:* ${address}, ${city}, ${state} - ${pincode}

*Ordered Items:*
${itemsText}

----------------------------------------
💵 *Subtotal:* ₹${subtotal.toLocaleString('en-IN')}
🏷️ *Discount:* -₹${discount.toLocaleString('en-IN')}
${paymentText}
💰 *Total Amount:* ₹${totalPayable.toLocaleString('en-IN')}
----------------------------------------
_Please confirm my order placement!_`;

  // 6. Launch WhatsApp
  const encodedMsg = encodeURIComponent(orderMessage);
  const whatsappUrl = `https://wa.me/${BUSINESS_PHONE}?text=${encodedMsg}`;
  window.open(whatsappUrl, '_blank');

  // 7. Clear Shopping Cart
  localStorage.removeItem(CART_STORAGE_KEY);

  // 8. Redirect with Order ID query param
  window.location.href = `./checkout-success.html?orderId=${generatedOrderId}`;
}