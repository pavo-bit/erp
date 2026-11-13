import { DecimalValue, toPaise } from "./money";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one === 0 ? TENS[ten] : `${TENS[ten]} ${ONES[one]}`;
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return "";
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundred > 0 && remainder > 0) {
    return `${ONES[hundred]} Hundred ${twoDigitsToWords(remainder)}`;
  }
  if (hundred > 0) {
    return `${ONES[hundred]} Hundred`;
  }
  return twoDigitsToWords(remainder);
}

/**
 * Converts numeric/decimal currency amount to formal Indian English words.
 * Formats: Crores, Lakhs, Thousands, Hundreds, and Paise.
 * Example: 15450.50 -> "Rupees Fifteen Thousand Four Hundred Fifty and Fifty Paise Only"
 */
export function amountToWordsIndianRupees(amount: DecimalValue): string {
  const totalPaise = toPaise(amount);
  if (totalPaise === 0) {
    return "Rupees Zero Only";
  }

  const isNegative = totalPaise < 0;
  const absPaise = Math.abs(totalPaise);
  const rupees = Math.floor(absPaise / 100);
  const paise = absPaise % 100;

  let words = "";

  if (rupees === 0) {
    words = "Zero";
  } else {
    let num = rupees;
    const parts: string[] = [];

    // Crores (>= 1,00,00,000)
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    if (crore > 0) {
      parts.push(`${amountToWordsHelper(crore)} Crore`);
    }

    // Lakhs (>= 1,00,000)
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    if (lakh > 0) {
      parts.push(`${twoDigitsToWords(lakh)} Lakh`);
    }

    // Thousands (>= 1,000)
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    if (thousand > 0) {
      parts.push(`${twoDigitsToWords(thousand)} Thousand`);
    }

    // Hundreds & Below (< 1,000)
    if (num > 0) {
      parts.push(threeDigitsToWords(num));
    }

    words = parts.filter(Boolean).join(" ");
  }

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${twoDigitsToWords(paise)} Paise`;
  }
  result += " Only";

  return isNegative ? `Minus ${result}` : result;
}

function amountToWordsHelper(n: number): string {
  if (n < 100) return twoDigitsToWords(n);
  return threeDigitsToWords(n);
}

