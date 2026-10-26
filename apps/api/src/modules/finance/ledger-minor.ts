import { Prisma } from '@prisma/client';

/** Read legacy integral decimal text without rounding or changing stored history. */
export function ledgerMinor(value: string): string {
  const amount = new Prisma.Decimal(value);
  if (!amount.isFinite() || !amount.isInteger() || amount.lte(0)) throw new Error('Invalid stored ledger minor units');
  return amount.toFixed(0);
}
