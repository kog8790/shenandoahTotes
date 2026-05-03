export async function handler(event) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const { id, fields } = JSON.parse(event.body);

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Reservations`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      records: [
        {
          id,
          fields
        }
      ]
    })
  });

  const data = await res.json();

  return {
    statusCode: res.status,
    body: JSON.stringify(data)
  };
}
