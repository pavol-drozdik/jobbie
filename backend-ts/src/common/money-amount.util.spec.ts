import { parseOptionalMoneyAmount } from './money-amount.util';

describe('money-amount.util', () => {
  it('normalizes to two decimal places via parseOptionalMoneyAmount', () => {
    expect(parseOptionalMoneyAmount(10.5)).toBe(10.5);
    expect(parseOptionalMoneyAmount(10.505)).toBe(10.51);
    expect(parseOptionalMoneyAmount(10.504)).toBe(10.5);
  });

  it('parses optional amounts', () => {
    expect(parseOptionalMoneyAmount('10.33')).toBe(10.33);
    expect(parseOptionalMoneyAmount(null)).toBeNull();
    expect(parseOptionalMoneyAmount('x')).toBeNull();
  });
});
