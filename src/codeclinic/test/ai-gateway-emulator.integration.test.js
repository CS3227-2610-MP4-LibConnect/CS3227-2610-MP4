/** @jest-environment node */
const { spawnSync } = require('child_process');
const path = require('path');
const emulatorTest = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ? test : test.skip;

emulatorTest('gateway integrates a loopback fake provider with real emulator counters and usage', () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.CODECLINIC_FIRESTORE_MODE).toBe('local-emulator');
  expect(process.env.CODECLINIC_FIRESTORE_PROJECT_ID).toBe('demo-codeclinic');
  const script = String.raw`
    const assert = require('node:assert/strict');
    const http = require('node:http');
    const crypto = require('node:crypto');
    const { createAiGateway } = require('./server/ai/gateway');
    const { resolveFirestoreTarget, connectFirestoreTarget } = require('./server/firestore-target');
    let step = 'connect';
    (async () => {
      const db = await connectFirestoreTarget(resolveFirestoreTarget(process.env));
      const userId = 'synthetic-ai-' + crypto.randomUUID();
      const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const request = JSON.parse(body);
          assert.equal(request.messages.length, 2);
          assert.equal(request.messages[1].content.includes('learner@example.invalid'), false);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ choices: [{ message: { content: '{"hint":"Inspect the condition."}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 } }));
        });
      });
      try {
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;
        const gateway = createAiGateway({ db, env: {
          SOCLAAS_API_KEY: 'test-key-not-real', SOCLAAS_BASE_URL: 'https://provider.invalid/v1', SOCLAAS_MODEL: 'test-model',
        }, fetch: async (url, options) => {
          assert.equal(url, 'https://provider.invalid/v1/chat/completions');
          return fetch('http://127.0.0.1:' + port + '/chat/completions', options);
        }});
        gateway.register({ feature: 'ERROR_EXPLAINER', systemPrompt: 'Return a JSON hint.',
          buildUserContent: input => input.text, maxInputChars: 200, maxOutputTokens: 30,
          parse: value => typeof value.hint === 'string' ? { ok: true, data: value } : { ok: false },
        });
        step = 'pipeline';
        const result = await gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId, accountType: 'STUDENT' },
          input: { text: 'learner@example.invalid: why does the loop stop?' } });
        assert.deepEqual(result, { ok: true, data: { hint: 'Inspect the condition.' } });
        step = 'usage';
        const usage = await db.collection('aiUsage').where('userId', '==', userId).get();
        assert.equal(usage.size, 1);
        const record = usage.docs[0].data();
        assert.equal(record.outcome, 'SUCCESS');
        assert.equal(record.inputTokens, 10);
        assert.equal(record.outputTokens, 5);
        assert.equal(record.cachedTokens, null);
        assert.equal(record.attempts, 1);
        assert.equal(JSON.stringify(record).includes('learner@'), false);
        assert.equal(JSON.stringify(record).includes('Inspect the condition.'), false);
        step = 'counters';
        const counters = await db.collection('aiRateCounters').get();
        assert.ok(counters.size >= 3);
        process.stdout.write('Gateway loopback/emulator integration passed.\n');
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        const usage = await db.collection('aiUsage').where('userId', '==', userId).get();
        await Promise.all(usage.docs.map(doc => doc.ref.delete()));
        // Remove only this synthetic user's counters. The shared global
        // counter belongs to this disposable emulators:exec instance.
        await Promise.all(['ai-user-minute', 'ai-user-day'].map(kind =>
          db.collection('aiRateCounters').doc(crypto.createHash('sha256')
            .update(kind + ':' + userId).digest('hex')).delete()));
        await db.terminate();
      }
    })().catch(() => { process.stderr.write('Gateway integration failed at ' + step + '.\n'); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8', timeout: 30000,
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Gateway loopback/emulator integration passed.');
}, 35000);
