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
