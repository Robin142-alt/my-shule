import { BadRequestException } from '@nestjs/common';

const DATE_PARTS = /^\d{2}$/;
const YEAR_PART = /^\d{4}$/;

export function normalizeAdmissionNumber(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');

  if (!normalized) {
    throw new BadRequestException('Admission number is required');
  }

  if (!/^[A-Z0-9][A-Z0-9._/-]{1,49}$/.test(normalized)) {
    throw new BadRequestException(
      'Admission number may only contain letters, numbers, dots, underscores, slashes, or hyphens',
    );
  }

  return normalized;
}

export function parseAdmissionDate(value: string, fieldName: string): string {
  const input = value.trim();
  let year: string;
  let month: string;
  let day: string;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    [year, month, day] = input.split('-');
  } else {
    const parts = input.split(/[/-]/);
    if (
      parts.length !== 3 ||
      !DATE_PARTS.test(parts[0] ?? '') ||
      !DATE_PARTS.test(parts[1] ?? '') ||
      !YEAR_PART.test(parts[2] ?? '')
    ) {
      throw new BadRequestException(
        `${fieldName} must use DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD`,
      );
    }
    [day, month, year] = parts;
  }

  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new BadRequestException(`${fieldName} is not a valid calendar date`);
  }

  return isoDate;
}

export function parseOptionalAdmissionDate(
  value: string | null | undefined,
  fieldName: string,
): string | null {
  const input = value?.trim();
  return input ? parseAdmissionDate(input, fieldName) : null;
}

export function normalizeKenyanPhone(value: string): string {
  let digits = value.trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;

  if (!/^254(?:1|7)\d{8}$/.test(digits)) {
    throw new BadRequestException(
      'Guardian phone must be a valid Kenyan mobile number, for example 0712345678',
    );
  }

  return `+${digits}`;
}

export function normalizePersonName(value: string, fieldName: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new BadRequestException(`${fieldName} is required`);
  return normalized;
}
