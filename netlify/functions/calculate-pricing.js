const PACKAGE_PRICING = {
  light: 29.99,
  family: 74.99,
  full: 119.99
};

const ITEM_PRICING = {
  "Classic Tote": 2.5,
  "Wheeled Tote": 9,
  "Dolly": 10,
  "Mattress Bag": 5
};

const DELIVERY_FEE = 25;
const FREE_DELIVERY_THRESHOLD = 29;
const INCLUDED_RENTAL_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const [, year, month, day] = match;

  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  const parsedDate = new Date(timestamp);

  const isValidDate =
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() === Number(month) - 1 &&
    parsedDate.getUTCDate() === Number(day);

  if (!isValidDate) {
    throw new Error(`${fieldName} is not a valid date.`);
  }

  return timestamp;
}

function calculateRentalDays(startDate, endDate) {
  const startTimestamp = parseDateOnly(startDate, "startDate");
  const endTimestamp = parseDateOnly(endDate, "endDate");

  if (endTimestamp < startTimestamp) {
    throw new Error("Pickup date cannot be before drop-off date.");
  }

  const elapsedDays =
    (endTimestamp - startTimestamp) / MILLISECONDS_PER_DAY;

  return Math.max(1, elapsedDays);
}

function applyRentalDuration(baseWeeklySubtotal, rentalDays) {
  const additionalDays = Math.max(
    0,
    rentalDays - INCLUDED_RENTAL_DAYS
  );

  const dailyRate = baseWeeklySubtotal / INCLUDED_RENTAL_DAYS;

  return {
    baseWeeklySubtotal: roundCurrency(baseWeeklySubtotal),
    dailyRate: roundCurrency(dailyRate),
    includedDays: INCLUDED_RENTAL_DAYS,
    additionalDays,
    rentalDays,
    subtotal: roundCurrency(
      baseWeeklySubtotal + dailyRate * additionalDays
    )
  };
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeDiscountCode(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function calculateItemSubtotal(items) {
  if (!Array.isArray(items)) {
    throw new Error("Items must be provided as an array.");
  }

  return items.reduce((subtotal, item) => {
    const unitPrice = ITEM_PRICING[item?.name];

    if (unitPrice === undefined) {
      throw new Error(`Unknown item: ${item?.name || "unnamed item"}`);
    }

    const quantity = Number(item?.qty);

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Invalid quantity for ${item.name}.`);
    }

    return subtotal + unitPrice * quantity;
  }, 0);
}

function calculateSubtotal(selectedPackage, items) {
  if (selectedPackage) {
    const packagePrice = PACKAGE_PRICING[selectedPackage];

    if (packagePrice === undefined) {
      throw new Error("Unknown package selection.");
    }

    return packagePrice;
  }

  return calculateItemSubtotal(items);
}

function getPricingCodes() {
  const rawPricingCodes = process.env.PRICING_CODES;

  if (!rawPricingCodes) {
    return {};
  }

  try {
    const parsedPricingCodes = JSON.parse(rawPricingCodes);

    if (
      !parsedPricingCodes ||
      typeof parsedPricingCodes !== "object" ||
      Array.isArray(parsedPricingCodes)
    ) {
      throw new Error("PRICING_CODES must contain a JSON object.");
    }

    return parsedPricingCodes;
  } catch (error) {
    console.error("Could not parse PRICING_CODES:", error);
    return {};
  }
}

function applyPricingAdjustments({
  subtotal,
  deliveryFee,
  discountCode
}) {
  const adjustments = [];
  const normalizedCode = normalizeDiscountCode(discountCode);
  const pricingCodes = getPricingCodes();
  const pricingRule = normalizedCode
    ? pricingCodes[normalizedCode]
    : null;

  const originalTotal = roundCurrency(subtotal + deliveryFee);

  let adjustedSubtotal = subtotal;
  let adjustedDeliveryFee = deliveryFee;
  let finalTotal = originalTotal;
  let discountApplied = false;

  if (pricingRule) {
    const ruleType = pricingRule.type;
    const ruleValue = Number(pricingRule.value);

    if (!Number.isFinite(ruleValue) || ruleValue < 0) {
      throw new Error(`Invalid pricing value configured for ${normalizedCode}.`);
    }

    switch (ruleType) {
      case "fixed_total": {
        finalTotal = roundCurrency(ruleValue);

        adjustedSubtotal = finalTotal;
        adjustedDeliveryFee = 0;
        discountApplied = true;

        adjustments.push({
          type: "fixed_total",
          label: "Fixed checkout price",
          amount: roundCurrency(finalTotal - originalTotal)
        });

        break;
      }

      case "percent_off": {
        if (ruleValue > 100) {
          throw new Error(
            `Percent discount cannot exceed 100 for ${normalizedCode}.`
          );
        }

        const discountAmount = roundCurrency(
          originalTotal * (ruleValue / 100)
        );

        finalTotal = roundCurrency(originalTotal - discountAmount);
        discountApplied = true;

        adjustments.push({
          type: "percent_off",
          label: `${ruleValue}% off`,
          amount: -discountAmount
        });

        break;
      }

      default:
        throw new Error(
          `Unknown pricing rule type configured for ${normalizedCode}.`
        );
    }
  }

  return {
    subtotal: roundCurrency(adjustedSubtotal),
    deliveryFee: roundCurrency(adjustedDeliveryFee),
    adjustments,
    total: roundCurrency(finalTotal),
    discountApplied,
    discountMessage:
      normalizedCode && !discountApplied
        ? "Discount code is invalid."
        : discountApplied
          ? "Discount code applied."
          : ""
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return createResponse(405, {
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const request = JSON.parse(event.body || "{}");

    const selectedPackage =
      typeof request.selectedPackage === "string"
        ? request.selectedPackage.trim().toLowerCase()
        : null;

    const baseWeeklySubtotal = roundCurrency(
      calculateSubtotal(selectedPackage, request.items)
    );

    if (baseWeeklySubtotal <= 0) {
      return createResponse(400, {
        success: false,
        error: "At least one rental item must be selected."
      });
    }

    const rentalDays = calculateRentalDays(
      request.startDate,
      request.endDate
    );

    const rentalPricing = applyRentalDuration(
      baseWeeklySubtotal,
      rentalDays
    );

    const subtotal = rentalPricing.subtotal;

    const deliveryFee =
      subtotal < FREE_DELIVERY_THRESHOLD
        ? DELIVERY_FEE
        : 0;

    const pricing = applyPricingAdjustments({
      subtotal,
      deliveryFee,
      discountCode: request.discountCode
    });

    return createResponse(200, {
      success: true,
      pricing: {
        ...pricing,
        rentalDays: rentalPricing.rentalDays,
        includedDays: rentalPricing.includedDays,
        additionalDays: rentalPricing.additionalDays,
        baseWeeklySubtotal: rentalPricing.baseWeeklySubtotal,
        dailyRate: rentalPricing.dailyRate
      }
    });
  } catch (error) {
    console.error("Pricing calculation failed:", error);

    return createResponse(400, {
      success: false,
      error: error.message || "Could not calculate pricing."
    });
  }
}