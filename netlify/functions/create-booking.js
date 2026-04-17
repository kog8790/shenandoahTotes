export async function handler(event) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const data = JSON.parse(event.body);

  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Bookings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: data })
  });

  const result = await response.json();

  return {
    statusCode: response.status,
    body: JSON.stringify(result)

  console.log("booking response:", item.name, booking);
  };
}
