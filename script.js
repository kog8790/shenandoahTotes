// ===== CONFIG =====
const toteMap = {
  "Classic Tote": "recmOKV978UHpmWQj",
  "Wheeled Tote": "recQJlrDosM8nbILD",
  "Dolly": "recNf9ULXY9Glf0nk",
  "Mattress Bag": "recJabXU9XtVUtcgz",
};

const packagePricing = {
  light: 29.99,
  family: 74.99,
  full: 119.99
};

let selectedPackage = null;

// ===== FUNCTIONS =====
async function checkAvailability(data) {
  const response = await fetch("/.netlify/functions/check-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return await response.json();
}

async function checkServiceArea(data) {
  const response = await fetch("/.netlify/functions/check-service-area", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return await response.json();
}

async function addressAutocomplete(query) {
  const response = await fetch("/.netlify/functions/address-autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  return await response.json();
}

async function createBooking(data) {
  const response = await fetch("/.netlify/functions/create-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return await response.json();
}

async function createReservation(data) {
  const res = await fetch("/.netlify/functions/create-reservation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return await res.json();
}

async function getReservation(id) {
  const res = await fetch("/.netlify/functions/get-reservation", {
    method: "POST",
    body: JSON.stringify({ id })
  });

  return await res.json();
}

async function updateReservation(id, fields) {
  const res = await fetch("/.netlify/functions/update-reservation", {
    method: "POST",
    body: JSON.stringify({ id, fields })
  });

  return await res.json();
}

async function getInventory() {
  const response = await fetch("/.netlify/functions/get-inventory");

  return await response.json();
}

async function calculatePricing(data) {
  const response = await fetch("/.netlify/functions/calculate-pricing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Could not calculate pricing.");
  }

  return result.pricing;
}

function populateQuantitySelect(selectId, maximum) {
  const select = document.getElementById(selectId);

  select.innerHTML = "";

  for (let i = 0; i <= maximum; i++) {
    const option = document.createElement("option");

    option.value = i;
    option.textContent = i;

    select.appendChild(option);
  }
}

// ===== MAIN =====
document.addEventListener("DOMContentLoaded", async () => {
    
    if (typeof flatpickr === "function") {
      flatpickr("#startDate", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        disableMobile: true,
        onChange: updateTotal
      });

      flatpickr("#endDate", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        disableMobile: true,
        onChange: updateTotal
      });
    }

    try {
      const inventory = await getInventory();

      if (!inventory.success) {
        throw new Error(inventory.error || "Inventory request failed");
      }

      populateQuantitySelect(
        "classicTotes",
        inventory.inventory["Classic Tote"] ?? 0
      );

      populateQuantitySelect(
        "wheeledTotes",
        inventory.inventory["Wheeled Tote"] ?? 0
      );

      populateQuantitySelect(
        "dollies",
        inventory.inventory["Dolly"] ?? 0
      );

      populateQuantitySelect(
        "mattressBags",
        inventory.inventory["Mattress Bag"] ?? 0
      );
    } catch (error) {
      console.error("Could not load inventory:", error);

      populateQuantitySelect("classicTotes", 30);
      populateQuantitySelect("wheeledTotes", 4);
      populateQuantitySelect("dollies", 1);
      populateQuantitySelect("mattressBags", 4);
    }

    updateTotal();
    
    const selectedAddresses = {
      dropoffAddress: null,
      pickupAddress: null
    };

    function setupAddressAutocomplete(inputId, suggestionsId) {
      const input = document.getElementById(inputId);
      const suggestionsBox = document.getElementById(suggestionsId);
      let debounceTimer;

      input.addEventListener("input", () => {
        selectedAddresses[inputId] = null;
        clearTimeout(debounceTimer);

        const query = input.value.trim();

        if (query.length < 3) {
          suggestionsBox.style.display = "none";
          suggestionsBox.innerHTML = "";
          return;
        }

        debounceTimer = setTimeout(async () => {
          const result = await addressAutocomplete(query);
          const suggestions = result.suggestions || [];

          if (suggestions.length === 0) {
            suggestionsBox.style.display = "none";
            suggestionsBox.innerHTML = "";
            return;
          }

          suggestionsBox.innerHTML = suggestions.map((suggestion, index) => `
            <button class="address-suggestion" type="button" data-index="${index}">
              ${suggestion.label}
            </button>
          `).join("");

          suggestionsBox.querySelectorAll(".address-suggestion").forEach(button => {
            button.addEventListener("click", () => {
              const suggestion = suggestions[Number(button.dataset.index)];

              selectedAddresses[inputId] = suggestion;
              input.value = suggestion.label;

              suggestionsBox.style.display = "none";
              suggestionsBox.innerHTML = "";
            });
          });

          suggestionsBox.style.display = "block";
        }, 400);
      });

      input.addEventListener("blur", () => {
        setTimeout(() => {
          suggestionsBox.style.display = "none";
        }, 200);
      });
    }

    setupAddressAutocomplete("dropoffAddress", "dropoffSuggestions");
    setupAddressAutocomplete("pickupAddress", "pickupSuggestions");

  // ===== TOTAL / SUMMARY =====
  const INCLUDED_RENTAL_DAYS = 7;
  const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

  function parseDisplayDate(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return null;
    }

    const [, year, month, day] = match;

    const timestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    const parsedDate = new Date(timestamp);

    const isValidDate =
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day);

    return isValidDate ? timestamp : null;
  }

  function calculateDisplayRentalDays(startDate, endDate) {
    const startTimestamp = parseDisplayDate(startDate);
    const endTimestamp = parseDisplayDate(endDate);

    if (
      startTimestamp === null ||
      endTimestamp === null ||
      endTimestamp < startTimestamp
    ) {
      return null;
    }

    const elapsedDays =
      (endTimestamp - startTimestamp) / MILLISECONDS_PER_DAY;

    return Math.max(1, elapsedDays);
  }

  function calculateDisplayBaseWeeklySubtotal() {
    if (selectedPackage && packagePricing[selectedPackage] !== undefined) {
      return packagePricing[selectedPackage];
    }

    return (
      Number(document.getElementById("classicTotes").value || 0) * 2.5 +
      Number(document.getElementById("wheeledTotes").value || 0) * 9 +
      Number(document.getElementById("dollies").value || 0) * 10 +
      Number(document.getElementById("mattressBags").value || 0) * 5
    );
  }

  function updateTotal() {
    const classicQuantity =
      Number(document.getElementById("classicTotes").value || 0);

    const wheeledQuantity =
      Number(document.getElementById("wheeledTotes").value || 0);

    const dollyQuantity =
      Number(document.getElementById("dollies").value || 0);

    const mattressQuantity =
      Number(document.getElementById("mattressBags").value || 0);

    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const baseWeeklySubtotal = calculateDisplayBaseWeeklySubtotal();
    const rentalDays = calculateDisplayRentalDays(startDate, endDate);

    const additionalDays =
      rentalDays === null
        ? 0
        : Math.max(0, rentalDays - INCLUDED_RENTAL_DAYS);

    const dailyRate =
      baseWeeklySubtotal / INCLUDED_RENTAL_DAYS;

    const total =
      baseWeeklySubtotal + dailyRate * additionalDays;

    const durationSummary =
      rentalDays === null
        ? ""
        : `<br>Rental: ${rentalDays} day${rentalDays === 1 ? "" : "s"}`;

    const summaryHtml = `
      Classic: ${classicQuantity}<br>
      Wheeled: ${wheeledQuantity}<br>
      Dollies: ${dollyQuantity}<br>
      Mattress: ${mattressQuantity}${durationSummary}
    `;

    document.getElementById("orderTotal").textContent =
      total.toFixed(2);

    document.getElementById("summaryDetails").innerHTML =
      summaryHtml;

    document.getElementById("liveOrderTotal").textContent =
      total.toFixed(2);

    document.getElementById("liveSummaryDetails").innerHTML =
      summaryHtml;
  }
  
  // bind dropdown changes
  ["classicTotes", "wheeledTotes", "dollies", "mattressBags"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      selectedPackage = null;
      updateTotal();
    });
  });

  // ===== Button Actions =====
  document.getElementById("lightMoveBtn").addEventListener("click", () => {
    document.getElementById("classicTotes").value = 10;
    document.getElementById("wheeledTotes").value = 0;
    document.getElementById("dollies").value = 0;
    document.getElementById("mattressBags").value = 1;

    selectedPackage = "light";
    updateTotal();

    document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("familyMoveBtn").addEventListener("click", () => {
    document.getElementById("classicTotes").value = 20;
    document.getElementById("wheeledTotes").value = 1;
    document.getElementById("dollies").value = 1;
    document.getElementById("mattressBags").value = 2;

    selectedPackage = "family";
    updateTotal();

    document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("fullMoveBtn").addEventListener("click", () => {
    document.getElementById("classicTotes").value = 30;
    document.getElementById("wheeledTotes").value = 2;
    document.getElementById("dollies").value = 1;
    document.getElementById("mattressBags").value = 4;

    selectedPackage = "full";
    updateTotal();

    document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
  });

  // ===== BOOK NOW BUTTON =====
  document.getElementById("bookNowBtn").addEventListener("click", () => {
    document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
  });

  // ===== MODAL CLOSE =====
  document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("depositModal").style.display = "none";
  });

  // ===== MODAL BACKDROP CLICK CLOSE =====
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("depositModal");
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // ===== PAYPAL CHECKOUT STATE =====
let pendingCheckout = null;

const paypalContainer = document.getElementById("paypal-modal-container");
const discountCodeInput = document.getElementById("discountCode");
const discountMessage = document.getElementById("discountMessage");

async function applyModalDiscount() {
  if (!pendingCheckout) {
    discountMessage.textContent =
      "Please restart checkout before applying a discount.";
    return;
  }

  const discountCode = discountCodeInput.value.trim();

  discountCodeInput.disabled = true;
  discountMessage.textContent = discountCode
    ? "Checking discount…"
    : "Restoring regular price…";

  try {
    const pricing = await calculatePricing({
      selectedPackage: pendingCheckout.selectedPackage,
      items: pendingCheckout.items,
      startDate: pendingCheckout.start,
      endDate: pendingCheckout.end,
      discountCode
    });

    pendingCheckout.deliveryFee = pricing.deliveryFee;
    pendingCheckout.total = pricing.total;
    pendingCheckout.pricing = pricing;
    pendingCheckout.discountCode = pricing.discountApplied
      ? discountCode
      : "";

    document.getElementById("modalTotal").textContent =
      pricing.total.toFixed(2);

    if (!discountCode) {
      discountMessage.textContent = "";
      return;
    }

    discountMessage.textContent = pricing.discountApplied
      ? pricing.discountMessage || "Discount code applied."
      : pricing.discountMessage || "Discount code is invalid.";
  } catch (error) {
    console.error("Could not apply discount:", error);
    discountMessage.textContent =
      "Discount could not be applied. Please try again.";
  } finally {
    discountCodeInput.disabled = false;
  }
}

discountCodeInput.addEventListener("input", () => {
  discountMessage.textContent = "";
});

discountCodeInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  applyModalDiscount();
});

discountCodeInput.addEventListener("blur", () => {
  applyModalDiscount();
});

paypal.Buttons({
  createOrder(data, actions) {
    if (!pendingCheckout || !pendingCheckout.total) {
      throw new Error("Checkout data is not ready.");
    }

    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: pendingCheckout.total.toFixed(2)
          }
        }
      ]
    });
  },

  async onApprove(data, actions) {
    if (!pendingCheckout) {
      alert("Checkout information is missing. Please restart your reservation.");
      return;
    }

    const details = await actions.order.capture();

    console.log("PayPal payment successful:", details);

    const {
      name,
      email,
      phone,
      start,
      end,
      pickupAddress,
      dropoffAddress,
      notes,
      items,
      deliveryFee
    } = pendingCheckout;

    // Re-check availability after payment, before creating Airtable records
    const finalAvailability = await checkAvailability({
      startDate: start,
      endDate: end,
      items
    });

    if (!finalAvailability.available) {
      alert(
        "Payment was successful, but availability changed before the reservation could be created. Please contact support."
      );
      return;
    }

    // ===== CREATE RESERVATION AFTER PAYMENT =====
    const reservation = await createReservation({
      "Customer Name": name,
      "Email": email,
      "Phone": phone,
      "Drop Off Address": dropoffAddress,
      "Pick Up Address": pickupAddress,
      "Notes": notes,
      "Invoice Paid": true,
      "Delivery Fee": deliveryFee
    });

    console.log("reservation response:", reservation);

    const reservationId = reservation.id;

    if (!reservationId) {
      alert(
        "Payment was successful, but reservation creation failed. Please contact support."
      );
      console.error("Invalid reservation response:", reservation);
      return;
    }

    // ===== CREATE BOOKINGS AFTER PAYMENT =====
    let successCount = 0;

    for (const item of items) {
      if (item.qty <= 0) {
        continue;
      }

      try {
        const booking = await createBooking({
          "Tote Type": [toteMap[item.name]],
          "Number Reserved": item.qty,
          "Start Date Time": start,
          "End Date Time": end,
          "Reservation ID": [reservationId]
        });

        console.log("booking response:", item.name, booking);
        successCount++;
      } catch (error) {
        console.error("booking failed:", item.name, error);
      }
    }

    if (successCount === 0) {
      alert(
        "Payment was successful, but no bookings were created. Please contact support."
      );
      return;
    }

    pendingCheckout = null;
    document.getElementById("depositModal").style.display = "none";

    alert("Payment successful! Reservation confirmed.");
  },

  onError(error) {
    console.error("PayPal error:", error);
    alert("Payment failed. Please try again or contact support.");
  }
}).render(paypalContainer);

// ===== SUBMIT LOGIC =====
document
  .getElementById("submitReservationBtn")
  .addEventListener("click", async () => {
    const form = document.getElementById("bookingForm");
    const submitButton = document.getElementById("submitReservationBtn");

    if (!form.reportValidity()) {
      return;
    }

    if (!selectedAddresses.dropoffAddress) {
      alert("Please choose a valid drop-off address from the suggestions.");
      document.getElementById("dropoffAddress").focus();
      return;
    }

    if (!selectedAddresses.pickupAddress) {
      alert("Please choose a valid pick-up address from the suggestions.");
      document.getElementById("pickupAddress").focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Preparing checkout…";

    try {
      // ===== CUSTOMER INFO =====
      const name = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const phone = document.getElementById("phone").value;
      const start = document.getElementById("startDate").value;
      const end = document.getElementById("endDate").value;
      const pickupAddress = document.getElementById("pickupAddress").value;
      const dropoffAddress = document.getElementById("dropoffAddress").value;
      const notes = document.getElementById("notes").value;

      // ===== ITEMS =====
      const items = [
        {
          name: "Classic Tote",
          qty: Number(document.getElementById("classicTotes").value)
        },
        {
          name: "Wheeled Tote",
          qty: Number(document.getElementById("wheeledTotes").value)
        },
        {
          name: "Dolly",
          qty: Number(document.getElementById("dollies").value)
        },
        {
          name: "Mattress Bag",
          qty: Number(document.getElementById("mattressBags").value)
        }
      ];

      // ===== CHECK SERVICE AREA =====
      const serviceArea = await checkServiceArea({
        dropoffAddress,
        pickupAddress
      });

      let disclaimer = "";

      if (!serviceArea.dropoff.withinServiceArea) {
        disclaimer +=
          `• Drop-off address is ${serviceArea.dropoff.distanceMiles} miles away.\n` +
          `  Customer pickup will be required.\n\n`;
      }

      if (!serviceArea.pickup.withinServiceArea) {
        disclaimer +=
          `• Pick-up address is ${serviceArea.pickup.distanceMiles} miles away.\n` +
          `  Customer return will be required.\n\n`;
      }

      if (disclaimer.length > 0) {
        const proceed = confirm(
          "Outside Service Area\n\n" +
          disclaimer +
          "Would you like to continue with your reservation?"
        );

        if (!proceed) {
          return;
        }
      }

      // ===== CHECK AVAILABILITY BEFORE PAYMENT =====
      const availability = await checkAvailability({
        startDate: start,
        endDate: end,
        items
      });

      if (!availability.available) {
        const message = availability.conflicts
          .map(
            conflict =>
              `${conflict.item}: requested ${conflict.requested}, available ${conflict.available}`
          )
          .join("\n");

        alert("Some items are not available:\n\n" + message);
        return;
      }

      // ===== AUTHORITATIVE PRICING =====
      const pricing = await calculatePricing({
        selectedPackage,
        items,
        startDate: start,
        endDate: end,
        discountCode: ""
      });

      if (!pricing.total || pricing.total <= 0) {
        alert("Could not calculate order total. Please contact support.");
        return;
      }

      pendingCheckout = {
        name,
        email,
        phone,
        start,
        end,
        pickupAddress,
        dropoffAddress,
        notes,
        items,
        selectedPackage,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total,
        pricing,
        discountCode: ""
      };

      document.getElementById("discountCode").value = "";
      document.getElementById("discountMessage").textContent = "";

      document.getElementById("modalTotal").textContent =
        pricing.total.toFixed(2);

      document.getElementById("depositModal").style.display = "flex";
    } catch (error) {
      console.error("Could not prepare checkout:", error);
      alert("Checkout could not be prepared. Please try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Review & Pay";
    }
  });
});