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
