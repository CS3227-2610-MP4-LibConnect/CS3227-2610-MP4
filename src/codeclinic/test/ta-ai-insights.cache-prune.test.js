const { createInsightsCache } = require('../server/tickets/ta-ai-insights');

describe('createInsightsCache pruning', () => {
  const ttlMs = 1000;
  let t;
  let cache;
  beforeEach(() => {
    t = 0;
    cache = createInsightsCache({ now: () => t, ttlMs });
  });

  it('removes entries older than the TTL when set is called', () => {
    cache.set('a', 'A');
    cache.set('b', 'B');
    t = ttlMs + 1;
    cache.set('c', 'C');
    // Move back so a read would not itself expire a/b: they must already be gone.
    t = 0;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('C');
  });

  it('keeps live entries on a later set', () => {
    cache.set('a', 'A');
    t = 500;
    cache.set('b', 'B');
    t = 900;
    cache.set('c', 'C');
    expect(cache.get('a')).toBe('A');
    expect(cache.get('b')).toBe('B');
    expect(cache.get('c')).toBe('C');
  });

  it('prunes only the expired entries from a mixed set', () => {
    cache.set('old', 1);
    t = 600;
    cache.set('mid', 2);
    t = 1200;
    cache.set('new', 3);
    t = 0;
    expect(cache.get('old')).toBeUndefined();
    expect(cache.get('mid')).toBe(2);
    expect(cache.get('new')).toBe(3);
  });

  it('keeps an entry exactly at the TTL boundary', () => {
    cache.set('a', 'A');
    t = ttlMs;
    cache.set('b', 'B');
    t = 0;
    expect(cache.get('a')).toBe('A');
  });
});
