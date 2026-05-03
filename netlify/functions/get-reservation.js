export async function handler(event) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const { id } = JSON.parse(event.body);

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Reservations/${id}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`
    }
  });

  const data = await res.json();

  return {
    statusCode: res.status,
    body: JSON.stringify(data)
  };
}
