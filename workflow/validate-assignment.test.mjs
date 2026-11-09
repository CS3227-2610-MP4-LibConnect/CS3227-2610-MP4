import test from 'node:test';
import assert from 'node:assert/strict';
import { validate as validateManifest } from '../src/workflow/validate-assignment.mjs';

const fixture = 'workflow/test-fixtures';
const evidencePath = `${fixture}/evidence.md`;
const validate = (manifest, phase) => validateManifest(manifest, phase, { allowFixturePaths: true });

function evidence() {
  return {
    implementationReport: evidencePath,
    implementationLog: evidencePath,
    checks: [{ command: 'node --test', result: 'pass' }],
    reviewReport: evidencePath,
    reviewLog: evidencePath,
    reviewVerdict: 'pass'
  };
}

function manifest() {
  return {
    schemaVersion: 2,
    taskId: 'validator-fixture',
    batch: 1,
    items: ['T01', 'T02'],
    artifacts: {
      spec: { path: `${fixture}/spec.md`, version: '0.1' },
      checklist: { path: `${fixture}/tasks.md`, version: '0.1' },
      handoff: { path: `${fixture}/handoff.md`, version: '0.1' }
    },
    approvalEvidence: `${fixture}/handoff.md`,
    implementer: { agentId: 'implementer-a', worktree: 'implementation', allowedFiles: ['src/example/a.js', 'src/example/b.js'] },
    reviewer: { agentId: 'reviewer-a', worktree: 'review', reviewOnlyFiles: [] },
    itemEvidence: { T01: evidence(), T02: evidence() }
  };
}

test('accepts the next two items with one implementer and independent reviewer', () => {
  assert.deepEqual(validate(manifest(), 'plan'), []);
  assert.deepEqual(validate(manifest(), 'complete'), []);
});

test('rejects skipped, repeated, and oversized item assignments', () => {
  const skipped = manifest();
  skipped.items = ['T01', 'T03'];
  assert.ok(validate(skipped).some(error => error.includes('next 2 unfinished')));
  const repeated = manifest();
  repeated.items = ['T01', 'T01'];
  assert.ok(validate(repeated).some(error => error.includes('next 2 unfinished')));
  const oversized = manifest();
  oversized.items = ['T01', 'T02', 'T03'];
  assert.ok(validate(oversized).some(error => error.includes('one or two')));
});

test('requires a reason for a nonfinal singleton and accepts a final singleton', () => {
  const earlySingleton = manifest();
  earlySingleton.items = ['T01'];
  assert.ok(validate(earlySingleton).some(error => error.includes('splitReason')));
  earlySingleton.splitReason = 'T01 has an approval boundary.';
  assert.deepEqual(validate(earlySingleton), []);

  const finalSingleton = manifest();
  finalSingleton.batch = 2;
  finalSingleton.items = ['T03'];
  finalSingleton.artifacts.checklist.path = `${fixture}/tasks-final.md`;
  finalSingleton.itemEvidence = { T03: evidence() };
  assert.deepEqual(validate(finalSingleton, 'complete'), []);
});

test('rejects self review and a shared worktree without compensating controls', () => {
  const selfReview = manifest();
  selfReview.reviewer.agentId = selfReview.implementer.agentId;
  assert.ok(validate(selfReview).some(error => error.includes('reviewer must differ')));
  const shared = manifest();
  shared.reviewer.worktree = shared.implementer.worktree;
  assert.ok(validate(shared).some(error => error.includes('separationException')));
});

test('rejects stale artifacts and missing per-item evidence', () => {
  const stale = manifest();
  stale.artifacts.spec.version = '0.2';
  assert.ok(validate(stale).some(error => error.includes('spec.version does not match')));
  const missing = manifest();
  delete missing.itemEvidence.T02.reviewReport;
  assert.ok(validate(missing, 'complete').some(error => error.includes('T02.reviewReport')));
});

test('production validation requires canonical artifact paths', () => {
  assert.ok(validateManifest(manifest()).some(error => error.includes('artifacts.spec.path must be')));
});
