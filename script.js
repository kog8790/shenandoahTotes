// ===== CONFIG =====
const toteMap = {
  "Classic Tote": "recmOKV978UHpmWQj",
  "Wheeled Tote": "recQJIrDosM8nbILD",
  "Dolly": "recNf9ULXY9Glf0nk",
  "Mattress Bag": "recJabXU9XtVUtcgz"
};

// ===== FUNCTIONS =====
async function createBooking(data) {
  const response = await fetch("/.netlify/functions/create-booking", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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

// ===== Button Actions =====
document.getElementById("lightMoveBtn").addEventListener("click", () => {
  document.getElementById("classicTotes").value = 10;
  document.getElementById("wheeledTotes").value = 1;
  document.getElementById("dollies").value = 0;
  document.getElementById("mattressBags").value = 1;

  document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("familyMoveBtn").addEventListener("click", () => {
  document.getElementById("classicTotes").value = 20;
  document.getElementById("wheeledTotes").value = 2;
  document.getElementById("dollies").value = 1;
  document.getElementById("mattressBags").value = 2;

  document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("fullMoveBtn").addEventListener("click", () => {
  document.getElementById("classicTotes").value = 30;
  document.getElementById("wheeledTotes").value = 4;
  document.getElementById("dollies").value = 1;
  document.getElementById("mattressBags").value = 4;

  document.getElementById("customerForm").scrollIntoView({ behavior: "smooth" });
});

// ===== Submit Logic =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("bookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // ===== CUSTOMER INFO =====
    const name = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;
    const POA = document.getElementById("pickupAddress").value;
    const DOA = document.getElementById("dropoffAddress").value;
    const notes = document.getElementById("notes").value;

    // ===== CREATE RESERVATION =====
    const reservation = await createReservation({
      "Customer Name": name,
      "Email": email,
      "Phone": phone,
      "Drop Off Address": DOA,
      "Pick Up Address": POA,
      "Notes": notes,
    });

    console.log("reservation response:", reservation);

    const reservationId = reservation.id;

    // ===== ITEMS =====
    const items = [
      { name: "Classic Tote", qty: Number(document.getElementById("classicTotes").value) },
      { name: "Wheeled Tote", qty: Number(document.getElementById("wheeledTotes").value) },
      { name: "Dolly", qty: Number(document.getElementById("dollies").value) },
      { name: "Mattress Bag", qty: Number(document.getElementById("mattressBags").value) }
    ];

    // ===== CREATE BOOKINGS & RESERVATION =====
    for (let item of items) {
      if (item.qty > 0) {
        await createBooking({
          "Tote Type": [toteMap[item.name]],
          "Number Reserved": item.qty,
          "Start Date Time": start,
          "End Date Time": end,
          "Reservation ID": [reservationId]
        });
        console.log("booking response:", item.name, booking);
      }
    }

    alert("Reservation submitted!");
  });
});
