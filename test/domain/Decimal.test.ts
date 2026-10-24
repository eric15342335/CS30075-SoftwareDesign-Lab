import { expect, test } from 'bun:test';

import { Decimal } from '#domain/Decimal.ts';

test('text hides float noise and negative zero', () => {
  expect(new Decimal(0.1).plus(new Decimal(0.2)).toString()).toBe('0.3');
  expect(new Decimal(-0).toString()).toBe('0');
  expect(new Decimal(-0.0000001).toString()).toBe('0');
  expect(new Decimal(-12.5).toString()).toBe('-12.5');
  expect(new Decimal(1234567).toString()).toBe('1234567');
});

test('parse accepts the SVG number grammar only', () => {
  expect(Decimal.parse('1e3').toString()).toBe('1000');
  expect(Decimal.parse('-.5').toString()).toBe('-0.5');
  for (const text of ['', ' 1', '12px', '0x10', 'Infinity', '1e999']) {
    expect(() => Decimal.parse(text)).toThrow(`invalid number: ${text}`);
  }
});

test('sign checks and scaling', () => {
  expect(new Decimal(-1).isNegative()).toBe(true);
  expect(new Decimal(0).isNegative()).toBe(false);
  expect(new Decimal(0).isPositive()).toBe(false);
  expect(new Decimal(2.5).times(new Decimal(4)).toString()).toBe('10');
});
