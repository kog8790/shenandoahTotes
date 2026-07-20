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
        disableMobile: true
      });

      flatpickr("#endDate", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        disableMobile: true
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
  function updateTotal() {
    let total;
  
    if (selectedPackage && packagePricing[selectedPackage]) {
      total = packagePricing[selectedPackage];
    } else {
      total =
        (Number(document.getElementById("classicTotes").value) * 2.5) +
        (Number(document.getElementById("wheeledTotes").value) * 9) +
        (Number(document.getElementById("dollies").value) * 10) +
        (Number(document.getElementById("mattressBags").value) * 5);
    }
  
    const summaryHtml = `
      Classic: ${document.getElementById("classicTotes").value}<br>
      Wheeled: ${document.getElementById("wheeledTotes").value}<br>
      Dollies: ${document.getElementById("dollies").value}<br>
      Mattress: ${document.getElementById("mattressBags").value}
    `;

    document.getElementById("orderTotal").textContent = total.toFixed(2);
    document.getElementById("summaryDetails").innerHTML = summaryHtml;

    document.getElementById("liveOrderTotal").textContent = total.toFixed(2);
    document.getElementById("liveSummaryDetails").innerHTML = summaryHtml;
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

  // ===== Submit Logic =====
  document.getElementById("submitReservationBtn").addEventListener("click", async () => {

    const form = document.getElementById("bookingForm");

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

    // ===== CUSTOMER INFO =====
    const name = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;
    const POA = document.getElementById("pickupAddress").value;
    const DOA = document.getElementById("dropoffAddress").value;
    const notes = document.getElementById("notes").value;

    // ===== ITEMS =====
    const items = [
      { name: "Classic Tote", qty: Number(document.getElementById("classicTotes").value) },
      { name: "Wheeled Tote", qty: Number(document.getElementById("wheeledTotes").value) },
      { name: "Dolly", qty: Number(document.getElementById("dollies").value) },
      { name: "Mattress Bag", qty: Number(document.getElementById("mattressBags").value) },
    ];

    // ===== CHECK SERVICE AREA =====
    const serviceArea = await checkServiceArea({
      dropoffAddress: DOA,
      pickupAddress: POA
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
        .map(c => `${c.item}: requested ${c.requested}, available ${c.available}`)
        .join("\n");

      alert("Some items are not available:\n\n" + message);
      return;
    }

    // ===== PAYMENT TOTAL =====
    let total = Number(document.getElementById("orderTotal").textContent || 0);
    const deliveryFee = total < 29 ? 25 : 0;
    total += deliveryFee;

    if (!total || total <= 0) {
      alert("Could not calculate order total. Please contact support.");
      return;
    }

    // ===== PAYPAL PAYMENT =====
    const paypalContainer = document.getElementById("paypal-modal-container");
    paypalContainer.innerHTML = "";

    document.getElementById("modalTotal").textContent = total.toFixed(2);
    document.getElementById("depositModal").style.display = "flex";

    paypal.Buttons({
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2)
            }
          }]
        });
      },

      onApprove: async function(data, actions) {
        const details = await actions.order.capture();

        console.log("PayPal payment successful:", details);

        // Re-check availability after payment, before creating Airtable records
        const finalAvailability = await checkAvailability({
          startDate: start,
          endDate: end,
          items
        });

        if (!finalAvailability.available) {
          alert("Payment was successful, but availability changed before the reservation could be created. Please contact support.");
          return;
        }

        // ===== CREATE RESERVATION AFTER PAYMENT =====
        const reservation = await createReservation({
          "Customer Name": name,
          "Email": email,
          "Phone": phone,
          "Drop Off Address": DOA,
          "Pick Up Address": POA,
          "Notes": notes,
          "Invoice Paid": true,
          "Delivery Fee": deliveryFee
        });

        console.log("reservation response:", reservation);

        const reservationId = reservation.id;

        if (!reservationId) {
          alert("Payment was successful, but reservation creation failed. Please contact support.");
          console.error("Invalid reservation response:", reservation);
          return;
        }

        // ===== CREATE BOOKINGS AFTER PAYMENT =====
        let successCount = 0;

        for (let item of items) {
          if (item.qty > 0) {
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

            } catch (err) {
              console.error("booking failed:", item.name, err);
            }
          }
        }

        if (successCount === 0) {
          alert("Payment was successful, but no bookings were created. Please contact support.");
          return;
        }

        alert("Payment successful! Reservation confirmed.");
      },

      onError: function(err) {
        console.error("PayPal error:", err);
        alert("Payment failed. Please try again or contact support.");
      }

    }).render("#paypal-modal-container");
  });

});
