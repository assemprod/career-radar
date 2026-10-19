import type { Vacancy } from './jobs';

// Personal requirement for relocation, not a universal salary floor.
export const DEFAULT_RELOCATION_MIN_NET_KZT = 600_000;

export type SalaryFit = 'meets' | 'potential' | 'below' | 'unknown' | 'not_applicable';
export type RelocationSalaryAssessment = {
  status: SalaryFit;
  needsRelocation: boolean;
  estimatedNetFrom: number | null;
  estimatedNetTo: number | null;
  message: string;
  isApproximation: boolean;
};

// Kazakhstan 2026: standard resident employee, no special privileges or extra
// deductions, standard 30-MCI deduction claimed at this employer. Not payroll advice.
// Calculated net estimates are intentionally approximate (e.g. yearly PIT base,
// specific employee statuses and benefits can change actual take-home pay).
const MCI_KZT_2026 = 4_325;
const MIN_WAGE_KZT_2026 = 85_000;
const STANDARD_DEDUCTION = 30 * MCI_KZT_2026;
const MONTHLY_PROGRESSIVE_THRESHOLD = 8_500 * MCI_KZT_2026 / 12;

export function estimateNetSalaryKz2026(monthlyGross: number): number {
  if (!Number.isFinite(monthlyGross) || monthlyGross < 0) throw new Error('Invalid gross salary');
  const pension = Math.min(monthlyGross, 50 * MIN_WAGE_KZT_2026) * 0.10;
  const healthInsurance = Math.min(monthlyGross, 20 * MIN_WAGE_KZT_2026) * 0.02;
  const taxable = Math.max(0, monthlyGross - pension - healthInsurance - STANDARD_DEDUCTION);
  const tax = Math.min(taxable, MONTHLY_PROGRESSIVE_THRESHOLD) * 0.10
    + Math.max(0, taxable - MONTHLY_PROGRESSIVE_THRESHOLD) * 0.15;
  return Math.max(0, Math.round(monthlyGross - pension - healthInsurance - tax));
}

const REMOTE_FORMAT = /(удал[её]н|remote|дистанцион)/i;
const HOME_CITY = /(кульсар|qulsary|kulsary)/i;

/** Other cities normally imply relocation unless the vacancy explicitly allows remote work.
 *  'Hybrid' is not fully remote and may still require relocation.
 */
export function needsRelocation(job: Vacancy): boolean {
  if (job.workFormat === 'remote' || REMOTE_FORMAT.test(job.schedule || '')) return false;
  if (!job.city || /^(не указан|казахстан|kazakhstan)$/i.test(job.city.trim())) return false;
  return !HOME_CITY.test(job.city);
}

function safeNet(value: number | null, gross: boolean | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  if (gross === true) return estimateNetSalaryKz2026(value);
  if (gross === false) return value;
  return null;
}

export function assessRelocationSalary(
  job: Vacancy,
  minNetKzt: number = DEFAULT_RELOCATION_MIN_NET_KZT,
  active = true,
): RelocationSalaryAssessment {
  const relocation = needsRelocation(job);
  const base = { needsRelocation: relocation, estimatedNetFrom: null, estimatedNetTo: null, isApproximation: false };
  if (!active || !relocation) {
    return { ...base, status: 'not_applicable', message: relocation ? 'Фильтр переезда отключён' : 'Порог для переезда не применяется' };
  }
  const salary = job.salary;
  if (!salary || (salary.from === null && salary.to === null)) {
    return { ...base, status: 'unknown', message: 'Зарплата не указана — уточни у работодателя' };
  }
  if (salary.currency !== 'KZT') {
    return { ...base, status: 'unknown', message: 'Другая валюта — сравнение без курса невозможно' };
  }
  if (salary.gross === null) {
    return { ...base, status: 'unknown', message: 'Неизвестно, указана зарплата до или после налогов' };
  }
  const low = safeNet(salary.from, salary.gross);
  const high = safeNet(salary.to, salary.gross);
  const detail = { needsRelocation: true, estimatedNetFrom: low, estimatedNetTo: high, isApproximation: salary.gross === true };
  if (low !== null && low >= minNetKzt) {
    return { ...detail, status: 'meets', message: salary.gross ? 'Расчётная сумма на руки проходит порог' : 'Заявленная сумма на руки проходит порог' };
  }
  if (high !== null && high < minNetKzt) {
    return { ...detail, status: 'below', message: 'Верхняя граница зарплаты ниже порога после налогов' };
  }
  // A range crossing the threshold, an open-ended 'from' below threshold,
  // or a 'to' >= threshold do NOT guarantee the required minimum income.
  return { ...detail, status: 'potential', message: 'Порог не гарантирован — уточни предложение и оклад на руки' };
}

export const moneyKzt = (n: number): string => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ₸`;
