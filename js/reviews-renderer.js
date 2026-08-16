/**
 * Loads and renders customer reviews & rating summary on product.html
 */
async function loadProductReviews(productId) {
  const container = document.getElementById('product-reviews-container');
  if (!container) return;

  try {
    const response = await fetch('data/reviews.json');
    if (!response.ok) throw new Error('Failed to load reviews');
    
    const allReviews = await response.json();
    const productReviews = allReviews.filter(r => String(r.asin) === String(productId));

    if (productReviews.length === 0) {
      container.innerHTML = `<p class="no-reviews">No customer reviews yet.</p>`;
      return;
    }

    // Render Review List
    const reviewsHtml = productReviews.map(review => `
      <div class="review-card border-b py-4">
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold text-gray-800">${escapeHtml(review.userName)}</span>
          <span class="text-xs text-gray-500">${review.date}</span>
        </div>
        <div class="flex items-center gap-1 text-yellow-500 mb-2">
          ${'★'.repeat(Math.round(review.rating))}${'☆'.repeat(5 - Math.round(review.rating))}
          <span class="text-xs font-bold text-gray-700 ml-1">${review.rating}/5</span>
        </div>
        ${review.title ? `<h5 class="font-medium text-gray-900">${escapeHtml(review.title)}</h5>` : ''}
        <p class="text-sm text-gray-600 mt-1">${escapeHtml(review.comment)}</p>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="reviews-header mb-6">
        <h3 class="text-xl font-bold">Customer Reviews (${productReviews.length})</h3>
      </div>
      <div class="reviews-list divide-y">
        ${reviewsHtml}
      </div>
    `;

  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}