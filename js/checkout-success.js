document.addEventListener('DOMContentLoaded', () => {
  renderOrderConfirmation();
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderOrderConfirmation() {
  const LAST_ORDER_KEY = 'jk_last_order';
  let orderData = null;

  try {
    orderData = JSON.parse(localStorage.getItem(LAST_ORDER_KEY));
  } catch (e) {
    console.error('Failed to parse order from localStorage:', e);
  }

  // Fallback to URL params if localStorage is empty
  const urlParams = new URLSearchParams(window.location.search);
  const urlOrderId = urlParams.get('orderId');

  const orderIdDisplay = document.getElementById('display-order-id');
  const detailsCard = document.getElementById('order-details-card');

  if (!orderData && !urlOrderId) {
    if (orderIdDisplay) orderIdDisplay.textContent = 'N/A';
    return;
  }

  const orderId = orderData?.orderId || urlOrderId || 'N/A';
  if (orderIdDisplay) orderIdDisplay.textContent = orderId;

  if (!orderData) return; // Only display full receipt if localStorage record exists

  // Populate Order Header
  const dateEl = document.getElementById('display-order-date');
  if (dateEl && orderData.orderDate) {
    const formattedDate = new Date(orderData.orderDate).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    dateEl.textContent = formattedDate;
  }

  // Populate Customer Info
  const cust = orderData.customer || {};
  const nameEl = document.getElementById('cust-name-display');
  const addrEl = document.getElementById('cust-address-display');
  const contactEl = document.getElementById('cust-contact-display');

  if (nameEl) nameEl.textContent = cust.name || 'N/A';
  if (addrEl) addrEl.textContent = `${cust.address || ''}, ${cust.city || ''}, ${cust.state || ''} - ${cust.pincode || ''}`;
  if (contactEl) contactEl.textContent = `Phone: ${cust.phone || 'N/A'} ${cust.email ? '| Email: ' + cust.email : ''}`;

  // Populate Payment Info
  const utrEl = document.getElementById('pay-utr-display');
  if (utrEl) utrEl.textContent = orderData.payment?.utrReference || 'N/A';

  // Populate Items List
  const itemsContainer = document.getElementById('ordered-items-list');
  if (itemsContainer && Array.isArray(orderData.items)) {
    itemsContainer.innerHTML = orderData.items.map(item => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      const total = price * qty;

      return `
        <div class="flex items-center justify-between text-xs py-2 border-b border-gray-50 last:border-0">
          <div class="flex items-center gap-3">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="w-12 h-12 object-contain rounded-lg border bg-gray-50 p-1 flex-shrink-0" />
            <div>
              <p class="font-bold text-gray-900">${escapeHtml(item.title)}</p>
              <p class="text-gray-500">Qty: ${qty} × ₹${price.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <span class="font-extrabold text-gray-900">₹${total.toLocaleString('en-IN')}</span>
        </div>
      `;
    }).join('');
  }

  // Populate Pricing
  const pricing = orderData.pricing || {};
  const subtotalEl = document.getElementById('receipt-subtotal');
  const discountRow = document.getElementById('receipt-discount-row');
  const discountEl = document.getElementById('receipt-discount');
  const totalEl = document.getElementById('receipt-total');

  if (subtotalEl) subtotalEl.textContent = `₹${(pricing.subtotal || 0).toLocaleString('en-IN')}`;
  
  if (discountRow && discountEl && pricing.discount > 0) {
    discountEl.textContent = `-₹${pricing.discount.toLocaleString('en-IN')}`;
    discountRow.classList.remove('hidden');
  }

  if (totalEl) totalEl.textContent = `₹${(pricing.totalPayable || 0).toLocaleString('en-IN')}`;

  // Unhide details card
  if (detailsCard) detailsCard.classList.remove('hidden');
}