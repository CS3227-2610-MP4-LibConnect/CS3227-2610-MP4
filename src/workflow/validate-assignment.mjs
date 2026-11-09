#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verdicts = new Set(['pass', 'pass-with-follow-up', 'changes-required']);
const checkResults = new Set(['pass', 'fail', 'skipped']);

function nonempty(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be a nonempty string`);
}

function relativeFile(value, label, errors, mustExist = true) {
  if (typeof value !== 'string' || !value.trim() || path.isAbsolute(value)) {
    errors.push(`${label} must be a nonempty repository-relative path`);
    return null;
  }
  const resolved = path.resolve(repositoryRoot, value.replaceAll('\\', '/'));
  if (resolved === repositoryRoot || !resolved.startsWith(repositoryRoot + path.sep)) {
    errors.push(`${label} must stay inside the repository`);
    return null;
  }
  if (mustExist && !existsSync(resolved)) errors.push(`${label} does not exist: ${value}`);
  return { normalized: path.relative(repositoryRoot, resolved).replaceAll('\\', '/'), resolved };
}

function checklistItems(content) {
  const items = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*- \[([ x])\] \*\*(T\d+)\b/);
    if (match) items.push({ id: match[2], done: match[1] === 'x' });
  }
  return items;
}

export function validate(manifest, phase = 'plan', { allowFixturePaths = false } = {}) {
  const errors = [];
  if (phase !== 'plan' && phase !== 'complete') errors.push('phase must be plan or complete');
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['manifest must be a JSON object'];
  if (manifest.schemaVersion !== 2) errors.push('schemaVersion must be 2');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.taskId ?? '')) errors.push('taskId must be lowercase kebab-case');
  if (!Number.isInteger(manifest.batch) || manifest.batch < 1) errors.push('batch must be a positive integer');

  const canonicalPaths = {
    spec: `workflow/specs/${manifest.taskId}.md`,
    checklist: `workflow/tasks/${manifest.taskId}/tasks.md`,
    handoff: `workflow/tasks/${manifest.taskId}/handoff.md`
  };
  const artifacts = manifest.artifacts ?? {};
  for (const key of ['spec', 'checklist', 'handoff']) {
    const artifact = artifacts[key] ?? {};
    const file = relativeFile(artifact.path, `artifacts.${key}.path`, errors);
    if (file && !allowFixturePaths && file.normalized !== canonicalPaths[key]) {
      errors.push(`artifacts.${key}.path must be ${canonicalPaths[key]}`);
    }
    nonempty(artifact.version, `artifacts.${key}.version`, errors);
    if (file && existsSync(file.resolved) && typeof artifact.version === 'string') {
      const prefix = key === 'handoff' ? 'Handoff version:' : 'Version:';
      const versionLine = readFileSync(file.resolved, 'utf8').split(/\r?\n/).find(line => line.startsWith(prefix));
      const actualVersion = versionLine?.slice(prefix.length).trim().split(/\s/)[0];
      if (actualVersion !== artifact.version) errors.push(`artifacts.${key}.version does not match ${artifact.path}`);
    }
  }
  relativeFile(manifest.approvalEvidence, 'approvalEvidence', errors);

  const checklist = relativeFile(artifacts.checklist?.path, 'checklist', [], true);
  const checklistEntries = checklist && existsSync(checklist.resolved)
    ? checklistItems(readFileSync(checklist.resolved, 'utf8')) : [];
  if (new Set(checklistEntries.map(item => item.id)).size !== checklistEntries.length) {
    errors.push('checklist repeats an item ID');
  }
  const unfinished = checklistEntries.filter(item => !item.done).map(item => item.id);
  if (unfinished.length === 0) errors.push('checklist has no unfinished items');
  if (!Array.isArray(manifest.items) || manifest.items.length < 1 || manifest.items.length > 2) {
    errors.push('items must contain one or two checklist IDs');
  } else {
    const expected = unfinished.slice(0, manifest.items.length);
    if (manifest.items.some((item, index) => item !== expected[index])) {
      errors.push(`items must be the next ${manifest.items.length} unfinished checklist item(s) in file order`);
    }
    if (manifest.items.length === 1 && unfinished.length > 1) {
      nonempty(manifest.splitReason, 'splitReason for a nonfinal singleton batch', errors);
    }
  }

  const implementer = manifest.implementer ?? {};
  const reviewer = manifest.reviewer ?? {};
  nonempty(implementer.agentId, 'implementer.agentId', errors);
  nonempty(implementer.worktree, 'implementer.worktree', errors);
  if (!Array.isArray(implementer.allowedFiles) || implementer.allowedFiles.length === 0) {
    errors.push('implementer.allowedFiles must be a nonempty array');
  } else {
    const seen = new Set();
    for (const [index, file] of implementer.allowedFiles.entries()) {
      const resolved = relativeFile(file, `implementer.allowedFiles[${index}]`, errors, false);
      if (resolved && seen.has(resolved.normalized)) errors.push(`implementer.allowedFiles repeats ${file}`);
      if (resolved) seen.add(resolved.normalized);
    }
  }
  nonempty(reviewer.agentId, 'reviewer.agentId', errors);
  nonempty(reviewer.worktree, 'reviewer.worktree', errors);
  if (implementer.agentId && implementer.agentId === reviewer.agentId) errors.push('reviewer must differ from implementer');
  if (implementer.worktree && implementer.worktree === reviewer.worktree) {
    nonempty(reviewer.separationException, 'reviewer.separationException for a shared worktree', errors);
  }
  if (reviewer.reviewOnlyFiles !== undefined && !Array.isArray(reviewer.reviewOnlyFiles)) {
    errors.push('reviewer.reviewOnlyFiles must be an array');
  } else for (const [index, file] of (reviewer.reviewOnlyFiles ?? []).entries()) {
    relativeFile(file, `reviewer.reviewOnlyFiles[${index}]`, errors, false);
  }

  if (phase === 'complete' && Array.isArray(manifest.items)) {
    for (const item of manifest.items) {
      const evidence = manifest.itemEvidence?.[item] ?? {};
      for (const key of ['implementationReport', 'implementationLog', 'reviewReport', 'reviewLog']) {
        relativeFile(evidence[key], `itemEvidence.${item}.${key}`, errors);
      }
      if (!Array.isArray(evidence.checks) || evidence.checks.length === 0) {
        errors.push(`itemEvidence.${item}.checks must be nonempty`);
      } else for (const [index, check] of evidence.checks.entries()) {
        nonempty(check?.command, `itemEvidence.${item}.checks[${index}].command`, errors);
        if (!checkResults.has(check?.result)) errors.push(`itemEvidence.${item}.checks[${index}].result is invalid`);
      }
      if (!verdicts.has(evidence.reviewVerdict)) errors.push(`itemEvidence.${item}.reviewVerdict is invalid`);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , manifestPath, phase = 'plan'] = process.argv;
  if (!manifestPath) {
    console.error('Usage: node src/workflow/validate-assignment.mjs <assignment-batch-N.json> [plan|complete]');
    process.exitCode = 2;
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const errors = validate(manifest, phase);
      if (path.basename(manifestPath) !== `assignment-batch-${manifest.batch}.json`) {
        errors.push(`manifest filename must be assignment-batch-${manifest.batch}.json`);
      }
      if (errors.length) {
        for (const error of errors) console.error(`- ${error}`);
        process.exitCode = 1;
      } else console.log(`Assignment batch ${manifest.batch} ${phase} checks passed. Human approval and evidence review remain separate.`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
  }
}
