export async function fetchAllRecords(baseId, tableName, token) {
  let records = [];
  let offset;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
    );

    if (offset) {
      url.searchParams.append("offset", offset);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Airtable request failed for ${tableName}: ${JSON.stringify(data)}`
      );
    }

    records = records.concat(data.records || []);
    offset = data.offset;
  } while (offset);

  return records;
}