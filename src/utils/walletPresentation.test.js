import test from 'node:test';
import assert from 'node:assert/strict';
import { walletRate, walletPacks, ledgerUsd } from './walletPresentation.js';
test('wallet uses configured rates without a silent fixed-rate fallback', () => {
  assert.equal(walletRate({starsPerUsd:25}),25);
  assert.equal(walletRate({}),null);
  assert.equal(walletRate({starsPerUsd:0}),null);
  assert.equal(ledgerUsd({starsChange:100},25),4);
  assert.equal(ledgerUsd({starsChange:100,metadata:{usdAmount:7}},25),7);
  assert.equal(ledgerUsd({starsChange:100},null),null);
});
test('packs use the backend catalogue and exact backend bonus credits', () => {
  assert.deepEqual(walletPacks({}),[]);
  const packs=walletPacks({topUpPacks:[{usd:12.49,stars:312,bonusStars:8},{usd:-1,stars:100}]});
  assert.equal(packs.length,1);
  assert.equal(packs[0].total,320);
  assert.equal(packs[0].usd,12.49);
});
