import { describe, it, expect } from 'vitest';
import { toE164 } from '@/utils/phone';

describe('toE164 — Australian E.164 formatting', () => {
  it('converts 04xx mobile (leading 0, 10 digits) to +614...', () => {
    expect(toE164('0412345678')).toBe('+61412345678');
  });
  it('converts 9-digit mobile without leading 0', () => {
    expect(toE164('412345678')).toBe('+61412345678');
  });
  it('strips spaces, dashes and parentheses', () => {
    expect(toE164('0412 345 678')).toBe('+61412345678');
    expect(toE164('(04) 1234-5678')).toBe('+61412345678');
  });
  it('passes through an already-prefixed +61 number', () => {
    expect(toE164('+61412345678')).toBe('+61412345678');
  });
  it('handles 61-prefixed digits', () => {
    expect(toE164('61412345678')).toBe('+61412345678');
  });
  it('returns empty string for empty/whitespace/non-digit input', () => {
    expect(toE164('')).toBe('');
    expect(toE164('   ')).toBe('');
    expect(toE164('abc')).toBe('');
  });
  it('does not double-prefix a 10-digit landline with leading 0', () => {
    // 07 3xxx xxxx Brisbane landline
    expect(toE164('0731234567')).toBe('+61731234567');
  });
});
