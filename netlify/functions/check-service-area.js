const SERVICE_RADIUS_MILES = 60;

// Approximate center of Winchester, VA / 22601
const HOME_BASE = {
  lat: 39.1857,
  lon: -78.1633
};

export async function handler(event) {
  try {

    const { dropoffAddress, pickupAddress } = JSON.parse(event.body);

    if (!dropoffAddress || !pickupAddress) {
      return response(400, {
        error: "Both dropoffAddress and pickupAddress are required."
      });
    }

    const dropoffCoords = await geocodeAddress(dropoffAddress);
    const pickupCoords = await geocodeAddress(pickupAddress);

    const dropoffDistance = getDistanceMiles(HOME_BASE, dropoffCoords);
    const pickupDistance = getDistanceMiles(HOME_BASE, pickupCoords);

    return response(200, {
      dropoff: {
        withinServiceArea: dropoffDistance <= SERVICE_RADIUS_MILES,
        distanceMiles: Number(dropoffDistance.toFixed(1))
      },
      pickup: {
        withinServiceArea: pickupDistance <= SERVICE_RADIUS_MILES,
        distanceMiles: Number(pickupDistance.toFixed(1))
      }
    });

  } catch (err) {

    return response(500, {
      error: err.message
    });

  }
}

async function geocodeAddress(address) {
  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ShenandoahTotes/1.0 (https://shenandoahtotes.com)"
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error("Unable to check service area right now.");
  }

  if (!data.length) {
    throw new Error(`Could not find address: ${address}`);
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon)
  };
}

function getDistanceMiles(pointA, pointB) {
  const earthRadiusMiles = 3958.8;

  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function response(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}
