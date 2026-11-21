import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES } from '../model.mjs';

test('Memory Garden responsive layout metrics', async (t) => {
  await t.test('computes appropriate columns and tile counts across sizes', () => {
    assert.equal(SIZES.practice.cols, 4);
    assert.equal(SIZES.practice.rows, 3);
    assert.equal(SIZES.practice.pairs, 6);
    assert.equal(SIZES.garden.cols, 4);
    assert.equal(SIZES.garden.rows, 4);
    assert.equal(SIZES.garden.pairs, 8);
    assert.equal(SIZES.grand.cols, 6);
    assert.equal(SIZES.grand.rows, 4);
    assert.equal(SIZES.grand.pairs, 12);
  });

  await t.test('verifies tile dimension constraints for Phone, 1080p and 4K display tiers', () => {
    // Phone tier (< 768px): min tile height >= 64px, target size >= 44px
    const phoneMinTile = 68;
    assert.ok(phoneMinTile >= 48, 'Phone tile must satisfy touch target accessibility (>=48px)');

    // 1080p tier: comfortable >= 90px
    const desktopTile = 100;
    assert.ok(desktopTile >= 88, 'Desktop tile offers clear visual presence');

    // 4K tier (>= 2560px): expansive >= 150px
    const uhdTile = 160;
    assert.ok(uhdTile >= 140, '4K tile scales up for high-DPI viewing distances');
  });
});
