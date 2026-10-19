import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRelocationSalary, estimateNetSalaryKz2026, needsRelocation, DEFAULT_RELOCATION_MIN_NET_KZT } from '../lib/salary.ts';

function vacancy({ city = 'Алматы', schedule = 'Полный день', workFormat = 'office', salary = null } = {}) {
  return { id: 'hh-1', source: 'hh.kz', title: 'Junior Product Manager', employer: 'Test', city,
    schedule, workFormat, salary, publishedAt: '', experience: '', snippet: '', url: 'https://hh.kz/vacancy/1' };
}
const salary = (from, to, gross = false, currency = 'KZT') => ({ from, to, gross, currency });

test('default net relocation threshold is 600,000 ₸', () => {
  assert.equal(DEFAULT_RELOCATION_MIN_NET_KZT, 600_000);
});

test('KZ 2026 gross-to-net standard deductions (sample salaries)', () => {
  assert.equal(estimateNetSalaryKz2026(600_000), 488_175);
  assert.equal(estimateNetSalaryKz2026(800_000), 646_575);
});

test('net ranges wholly at or above the threshold pass', () => {
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(600_000, 800_000) })).status, 'meets');
});

test('gross 600,000 is below threshold, not considered 600,000 on hand', () => {
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(500_000, 600_000, true) })).status, 'below');
});

test('gross 800,000 to 900,000 clears minimum after estimated tax', () => {
  const result = assessRelocationSalary(vacancy({ salary: salary(800_000, 900_000, true) }));
  assert.equal(result.status, 'meets');
  assert.equal(result.isApproximation, true);
});

test('cross-threshold or open ended insufficient range needs HR confirmation', () => {
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(450_000, 750_000) })).status, 'potential');
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(450_000, null) })).status, 'potential');
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(null, 800_000) })).status, 'potential');
});

test('upper bound under threshold is classified below', () => {
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(null, 550_000) })).status, 'below');
});

test('unspecified wage, ambiguous gross, and foreign currency remain unknown', () => {
  assert.equal(assessRelocationSalary(vacancy()).status, 'unknown');
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(800_000, 900_000, null) })).status, 'unknown');
  assert.equal(assessRelocationSalary(vacancy({ salary: salary(1000, 2000, false, 'USD') })).status, 'unknown');
});

test('remote offers in other cities exempt from relocation minimum', () => {
  assert.equal(needsRelocation(vacancy({ workFormat: 'remote' })), false);
  assert.equal(assessRelocationSalary(vacancy({ workFormat: 'remote', salary: salary(350_000, 450_000) })).status, 'not_applicable');
  assert.equal(assessRelocationSalary(vacancy({ schedule: 'Удалённая работа', workFormat: 'unknown' })).status, 'not_applicable');
});

test('jobs in home city do not trigger relocation minimum', () => {
  assert.equal(assessRelocationSalary(vacancy({ city: 'Кульсары', salary: salary(250_000, 350_000) })).status, 'not_applicable');
});

test('hybrid jobs in different cities do trigger relocation minimum', () => {
  assert.equal(assessRelocationSalary(vacancy({ workFormat: 'hybrid', salary: salary(250_000, 350_000) })).status, 'below');
});

test('relocation salary filter can be disabled', () => {
  assert.equal(assessRelocationSalary(vacancy(), 600_000, false).status, 'not_applicable');
});
