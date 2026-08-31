export const BIRTH_DATE_MIN_YEAR = 1900;

/** Menor idade permitida — ano máximo = ano atual menos esta idade. */
export const BIRTH_DATE_MIN_AGE = 12;

/** Maior idade aceita (idade máxima). */
export const BIRTH_DATE_MAX_AGE = 120;

export function getBirthDateMaxYear(): number {
  return new Date().getFullYear() - BIRTH_DATE_MIN_AGE;
}

/** Ano mínimo compatível com a idade máxima. */
export function getBirthDateMinYear(): number {
  return Math.max(BIRTH_DATE_MIN_YEAR, new Date().getFullYear() - BIRTH_DATE_MAX_AGE);
}

function ageFromParts(year: number, month: number, day: number, today = new Date()): number {
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) age--;
  return age;
}

export function validateBirthDateString(
  dateStr: string
): { valid: true } | { valid: false; error: string } {
  const trimmed = String(dateStr || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return { valid: false, error: "Data de nascimento inválida." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const minYear = getBirthDateMinYear();
  const maxYear = getBirthDateMaxYear();

  if (!Number.isFinite(year) || year < minYear || year > maxYear) {
    return {
      valid: false,
      error: `Ano de nascimento deve estar entre ${minYear} e ${maxYear}.`,
    };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, error: "Data de nascimento inválida." };
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return { valid: false, error: "Data de nascimento inválida." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed > today) {
    return { valid: false, error: "Data de nascimento não pode ser futura." };
  }

  const age = ageFromParts(year, month, day, today);
  if (age < BIRTH_DATE_MIN_AGE) {
    return {
      valid: false,
      error: `Idade mínima permitida: ${BIRTH_DATE_MIN_AGE} anos.`,
    };
  }
  if (age > BIRTH_DATE_MAX_AGE) {
    return {
      valid: false,
      error: `Idade máxima permitida: ${BIRTH_DATE_MAX_AGE} anos.`,
    };
  }

  return { valid: true };
}
