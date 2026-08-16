/**
 * Dynamic Partial Component Loader
 */
async function loadComponent(elementId, filepath) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const res = await fetch(filepath);
    if (!res.ok) throw new Error(`Could not load ${filepath}`);
    element.innerHTML = await res.text();
    
    // Trigger cart badge counter sync after header loads
    if (typeof updateCartBadge === 'function') {
      updateCartBadge();
    }
  } catch (err) {
    console.error(`Error loading partial [${filepath}]:`, err);
  }
}

/**
 * Sync cart count across all pages
 */
function updateCartBadge() {
  const cartBadge = document.getElementById('cart-badge-count');
  if (!cartBadge) return;

  const cart = JSON.parse(localStorage.getItem('jk_cart') || '[]');
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalQuantity;
}

// Load header on page load automatically
document.addEventListener('DOMContentLoaded', () => {
  loadComponent('header-component', './components/header.html');
});