/**
 * YONO SBI & Dynamic UPI Payment Handler
 * Location: /public/js/sbi-upi-handler.js
 */

const UPI_CONFIG = {
  vpa: "merchant@sbi", // Your registered SBI VPA / UPI ID
  merchantName: "JK Enterprises",
  currency: "INR"
};

/**
 * Generates a dynamic UPI QR Code and sets up mobile deep linking.
 * @param {string|number} amount - Total payable amount
 * @param {string} orderId - Unique order identifier
 * @param {string} containerId - DOM element ID to render QR code into
 */
function initUpiPayment(amount, orderId, containerId = "qrcode-container") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[UPI Handler] Container #${containerId} not found.`);
    return;
  }

  // Ensure QRCode library is loaded
  if (typeof QRCode === "undefined") {
    console.error("[UPI Handler] QRCode library is missing. Include qrcode.min.js in your HTML.");
    container.innerHTML = `<p class="text-xs text-red-500 font-semibold">QR Generator failed to load.</p>`;
    return;
  }

  // Clear previous contents
  container.innerHTML = "";

  // 1. Construct Standard UPI URI Scheme
  const parsedAmount = Number(amount) || 0;
  const note = `Order #${orderId}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(UPI_CONFIG.vpa)}&pn=${encodeURIComponent(UPI_CONFIG.merchantName)}&am=${parsedAmount.toFixed(2)}&tn=${encodeURIComponent(note)}&cu=${UPI_CONFIG.currency}`;

  // 2. Render QR Code via qrcode.min.js
  try {
    new QRCode(container, {
      text: upiString,
      width: 220,
      height: 220,
      colorDark: "#113880", // SBI Corporate Blue
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (err) {
    console.error("[UPI Handler] Failed to generate QR Code:", err);
    container.innerHTML = `<p class="text-xs text-red-500 font-semibold">Unable to generate QR code.</p>`;
  }

  // 3. Set Mobile Intent / Deep Link
  const mobilePayBtn = document.getElementById("pay-via-app-btn");
  if (mobilePayBtn) {
    mobilePayBtn.href = upiString;
  }
}

/**
 * Handles API-based YONO SBI Gateway Payment payloads (for API-driven dynamic QR)
 * @param {Object} apiResponse - Response payload from YONO SBI backend API
 * @param {string} containerId - DOM element ID for QR rendering
 */
function renderYonoSbiQr(apiResponse, containerId = "qrcode-container") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[UPI Handler] Container #${containerId} not found.`);
    return;
  }

  if (typeof QRCode === "undefined") {
    console.error("[UPI Handler] QRCode library is missing.");
    return;
  }

  container.innerHTML = "";

  const qrString = apiResponse?.qrString || apiResponse?.paymentUrl;

  if (qrString) {
    try {
      new QRCode(container, {
        text: qrString,
        width: 220,
        height: 220,
        colorDark: "#113880", // SBI Corporate Blue
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      console.error("[UPI Handler] Error rendering YONO SBI QR:", err);
    }
  } else {
    console.warn("[UPI Handler] No valid QR string found in API response.");
  }
}

/**
 * Optional: Polls backend to verify if UPI transaction completed
 * @param {string} orderId - Order ID to check
 * @param {function} onSuccess - Callback when payment is verified
 */
function pollUpiPaymentStatus(orderId, onSuccess) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/verify-upi-status?orderId=${encodeURIComponent(orderId)}`);
      const data = await response.json();

      if (data.status === "SUCCESS") {
        clearInterval(interval);
        if (typeof onSuccess === "function") {
          onSuccess(data);
        }
      }
    } catch (err) {
      console.error("[UPI Handler] Polling error:", err);
    }
  }, 3000); // Polls every 3 seconds

  // Automatically clear polling after 5 minutes timeout
  setTimeout(() => clearInterval(interval), 300000);
}