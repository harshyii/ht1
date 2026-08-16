/**
 * Utility: Extract query parameters from the current URL
 * Example: URL containing ?brand=Black%2BDecker returns { brand: "Black+Decker" }
 */
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value.replace(/^"|"$/g, ''); // strip optional wrapping quotes
  }
  return result;
}

/**
 * Helper to build clean dynamic URLs across pages
 */
const Navigation = {
  toCatalogByBrand: (brandName) => {
    return `/catalog.html?brand=${encodeURIComponent(brandName)}`;
  },
  toCatalogByCategory: (categoryName) => {
    return `/public/ catalog.html?category=${encodeURIComponent(categoryName)}`;
  },
  toProductDetails: (productId) => {
    return `/public/product.html?id=${encodeURIComponent(productId)}`;
  },
  toCart: () => {
    return `/public/cart.html`;
  }
};