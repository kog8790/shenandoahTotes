import { fetchAllRecords } from "./lib/airtable.js";

const TOTES_TABLE = "Totes";

export async function handler() {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_TOKEN || !BASE_ID) {
    return response(500, {
      success: false,
      error: "Missing Airtable configuration"
    });
  }

  try {
    const totes = await fetchAllRecords(
      BASE_ID,
      TOTES_TABLE,
      AIRTABLE_TOKEN
    );

    const inventory = {};

    for (const tote of totes) {
      const name = tote.fields["Name"];
      const totalInventory = Number(
        tote.fields["Total Inventory"] || 0
      );

      if (!name) {
        continue;
      }

      inventory[name] = totalInventory;
    }

    return response(200, {
      success: true,
      inventory
    });
  } catch (error) {
    console.error("get-inventory failed:", error);

    return response(500, {
      success: false,
      error: error.message
    });
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}