const difference = require('../difference');

describe('difference', () => {
  it('returns empty array', () => {
    expect(difference(['example'], ['example'])).toEqual([]);
  });

  it('returns missing values', () => {
    expect(difference(['example'], [])).toEqual(['example']);
  });
});
