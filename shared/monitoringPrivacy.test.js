import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { monitoringRoute } from './monitoringPrivacy.js';
test('routes exclude private names, identifiers and URL query parameters', () => {
  assert.equal(monitoringRoute('https://example.test/api/users/person@example.com?token=secret'), '/api/users/:id');
  assert.equal(monitoringRoute('/restore'), '/restore');
});
test('standalone clients and API use the same route privacy policy', (t) => {
  const paths = ['../OnlyMe-backend/src/utils/monitoringPrivacy.js', '../atseen-mobile/src/utils/monitoringPrivacy.js'].map((path) => new URL(path, import.meta.url));
  if (!paths.every(existsSync)) return t.skip('Sibling repositories not checked out');
  for (const path of paths) assert.equal(readFileSync(path, 'utf8'), readFileSync(new URL('./monitoringPrivacy.js', import.meta.url), 'utf8'));
});