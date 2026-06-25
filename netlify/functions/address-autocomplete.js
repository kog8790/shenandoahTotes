export async function handler(event) {
  try {
    const { query } = JSON.parse(event.body || "{}");

    if (!query || query.trim().length < 3) {
      return response(200, {
        suggestions: []
      });
    }

    const suggestions = await searchAddresses(query.trim());

    return response(200, {
      suggestions
    });

  } catch (err) {
    return response(500, {
      error: err.message,
      suggestions: []
    });
  }
}

async function searchAddresses(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ShenandoahTotes/1.0 (https://shenandoahtotes.com)"
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error("Unable to search addresses right now.");
  }

  return data.map(place => ({
    label: place.display_name,
    lat: Number(place.lat),
    lon: Number(place.lon)
  }));
}

function response(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}
