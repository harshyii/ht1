/**
 * Dynamic Coupon Engine driven directly by JSON
 */
const CouponEngine = {
  // Path to your JSON file
  jsonPath: 'data/coupons.json',

  /**
   * Fetches active coupons from JSON
   */
  async loadCoupons() {
    try {
      const response = await fetch(this.jsonPath);
      if (!response.ok) throw new Error('Failed to load coupons file');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('CouponEngine Error:', err);
      return [];
    }
  },

  /**
   * Validates a coupon code against JSON rules and cart contents
   * @param {string} code - The coupon code entered by user
   * @param {Array} cart - Array of cart item objects [{ id, title, price, quantity, brand, category }, ...]
   */
  async validateCoupon(code, cart = []) {
    const coupons = await this.loadCoupons();
    const cleanCode = code.trim().toUpperCase();

    // 1. Find coupon
    const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);
    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid coupon code.' };
    }

    // 2. Check active status
    if (coupon.status !== 'active') {
      return { valid: false, discount: 0, message: 'This coupon is no longer active.' };
    }

    // 3. Check expiry date
    if (coupon.expiryDate) {
      const today = new Date().toISOString().split('T')[0];
      if (today > coupon.expiryDate) {
        return { valid: false, discount: 0, message: 'This coupon has expired.' };
      }
    }

    // 4. Calculate total cart value
    const cartSubtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    // 5. Check minimum purchase condition
    if (cartSubtotal < coupon.min_purchase) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum purchase of ₹${coupon.min_purchase} required for this coupon.`
      };
    }

    // 6. Calculate eligible amount based on target rules
    let eligibleSubtotal = 0;
    const targets = coupon.target_value
      ? coupon.target_value.split(',').map(t => t.trim().toLowerCase())
      : [];

    cart.forEach(item => {
      const itemTotal = (item.price || 0) * item.quantity;

      if (coupon.target_type === 'all' || coupon.target_value === '*') {
        eligibleSubtotal += itemTotal;
      } else if (coupon.target_type === 'brand') {
        const itemBrand = (item.brand || '').toLowerCase();
        if (targets.some(t => t === itemBrand)) {
          eligibleSubtotal += itemTotal;
        }
      } else if (coupon.target_type === 'category') {
        const itemCategory = (item.category || '').toLowerCase();
        if (targets.some(t => t === itemCategory)) {
          eligibleSubtotal += itemTotal;
        }
      }
    });

    if (eligibleSubtotal === 0) {
      return {
        valid: false,
        discount: 0,
        message: `Coupon '${coupon.code}' is not applicable to the items in your cart.`
      };
    }

    // 7. Calculate Discount Value
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (eligibleSubtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value;
    }

    // 8. Apply max_discount limit
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }

    discount = Math.round(discount);

    return {
      valid: true,
      discount: discount,
      message: `Coupon '${coupon.code}' applied successfully! Saved ₹${discount}`
    };
  }
};