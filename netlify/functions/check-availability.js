export async function handler(event) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const BOOKINGS_TABLE = "Bookings";
  const TOTES_TABLE = "Totes";

  try {
    const { startDate, endDate, items } = JSON.parse(event.body);

    if (!startDate || !endDate || !items || !Array.isArray(items)) {
      return response(400, {
        available: false,
        error: "Missing startDate, endDate, or items"
      });
    }

    const totes = await fetchAllRecords(BASE_ID, TOTES_TABLE, AIRTABLE_TOKEN);
    const bookings = await fetchAllRecords(BASE_ID, BOOKINGS_TABLE, AIRTABLE_TOKEN);

    const toteInventory = {};

    for (const tote of totes) {
      const name = tote.fields["Name"];
      const totalInventory = Number(tote.fields["Total Inventory"] || 0);

      if (name) {
        toteInventory[name] = {
          id: tote.id,
          totalInventory
        };
      }
    }

    const conflicts = [];

    for (const requestedItem of items) {
      const itemName = requestedItem.name;
      const requestedQty = Number(requestedItem.qty || 0);

      if (requestedQty <= 0) continue;

      const tote = toteInventory[itemName];

      if (!tote) {
        conflicts.push({
          item: itemName,
          requested: requestedQty,
          available: 0,
          shortage: requestedQty,
          reason: "Item type not found"
        });
        continue;
      }

      let alreadyReserved = 0;

      for (const booking of bookings) {
        const fields = booking.fields;

        const status = fields["Status"];
        if (status === "Cancelled") continue;

        // Only paid reservations/bookings should block inventory
        const paid = fields["Paid"];
        if (!paid) continue;

        const bookingToteIds = fields["Tote Type"] || [];
        const sameTote = bookingToteIds.includes(tote.id);

        if (!sameTote) continue;

        const bookingStart = fields["Start Date Time"];
        const bookingEnd = fields["End Date Time"];

        if (!bookingStart || !bookingEnd) continue;

        const overlaps =
          new Date(bookingStart) <= new Date(endDate) &&
          new Date(bookingEnd) >= new Date(startDate);

        if (overlaps) {
          alreadyReserved += Number(fields["Number Reserved"] || 0);
        }
      }

      const availableQty = tote.totalInventory - alreadyReserved;

      if (requestedQty > availableQty) {
        conflicts.push({
          item: itemName,
          requested: requestedQty,
          available: availableQty,
          shortage: requestedQty - availableQty
        });
      }
    }

    return response(200, {
      available: conflicts.length === 0,
      conflicts
    });

  } catch (err) {
    return response(500, {
      available: false,
      error: err.message
    });
  }
}

async function fetchAllRecords(baseId, tableName, token) {
  let records = [];
  let offset;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);

    if (offset) {
      url.searchParams.append("offset", offset);
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    records = records.concat(data.records || []);
    offset = data.offset;

  } while (offset);

  return records;
}

function response(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}
