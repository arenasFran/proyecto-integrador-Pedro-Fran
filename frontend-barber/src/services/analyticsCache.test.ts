import { describe, expect, it, vi } from 'vitest';
import { analyticsApi } from './analyticsApi';
import { invalidateAnalyticsAfterSuccess } from './analyticsCache';

describe('invalidateAnalyticsAfterSuccess', () => {
  it('invalidates the shared analytics tag after a successful mutation', async () => {
    const dispatch = vi.fn();

    invalidateAnalyticsAfterSuccess(Promise.resolve({}), dispatch);
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith(analyticsApi.util.invalidateTags(['Analytics']));
  });

  it('does not invalidate analytics when the mutation fails', async () => {
    const dispatch = vi.fn();

    invalidateAnalyticsAfterSuccess(Promise.reject(new Error('request failed')), dispatch);
    await Promise.resolve();

    expect(dispatch).not.toHaveBeenCalled();
  });
});
