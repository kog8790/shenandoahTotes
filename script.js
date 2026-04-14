// ===== CONFIG =====
const toteMap = {
  "Classic Tote": "recOKV978UHpmWQj",
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
