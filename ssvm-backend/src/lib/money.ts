import { Prisma } from "@prisma/client";

export type DecimalValue = Prisma.Decimal | number | string;

/**
 * Converts a rupee amount (Decimal, number, or string) to paise (integer).
 * e.g., 50.25 -> 5025
 */
export function toPaise(amount: DecimalValue): number {
  if (amount === undefined || amount === null) return 0;
  const dec = new Prisma.Decimal(amount);
  return Math.round(dec.mul(100).toNumber());
}

/**
 * Converts paise (integer) to Decimal rupees with 2 decimal places.
 * e.g., 5025 -> Decimal(50.25)
 */
export function fromPaise(paise: number | bigint): Prisma.Decimal {
  if (paise === undefined || paise === null) return new Prisma.Decimal(0);
  const dec = new Prisma.Decimal(paise.toString());
  return dec.div(100).toDecimalPlaces(2);
}

/**
 * Ensures value is a Prisma.Decimal.
 */
export function toDecimal(value: DecimalValue): Prisma.Decimal {
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

/**
 * Safely rounds a Decimal, number, or string to specified decimal places (default 2, half-up).
 */
export function safeRound(value: DecimalValue, decimals: number = 2): Prisma.Decimal {
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value).toDecimalPlaces(decimals, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Safely sums multiple Decimal, number, or string amounts.
 */
export function sumDecimals(...values: (DecimalValue | undefined | null)[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, val) => {
    if (val === undefined || val === null) return acc;
    return acc.add(new Prisma.Decimal(val));
  }, new Prisma.Decimal(0));
}
