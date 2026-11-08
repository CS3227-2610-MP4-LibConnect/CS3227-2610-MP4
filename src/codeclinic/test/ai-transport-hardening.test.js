/** @jest-environment node */
const { createTransport, MAX_RESPONSE_BYTES } = require('../server/ai/transport');
const { loadAiConfig } = require('../server/ai/config');
const config = loadAiConfig({ SOCLAAS_API_KEY: 'test-key-not-real', SOCLAAS_BASE_URL: 'https://provider.invalid/v1', SOCLAAS_MODEL: 'test-model' }).config;
const messages = [{ role: 'system', content: 'JSON only' }, { role: 'user', content: 'synthetic content' }];
function transport(fetch) { return createTransport({ config, fetch }); }

test('rejects a declared oversized response before reading and never retries', async () => {
  const cancel = jest.fn();
  const text = jest.fn();
  const fetch = jest.fn(async () => ({ status: 200, headers: { get: () => String(MAX_RESPONSE_BYTES + 1) }, body: { cancel }, text }));
  const result = await transport(fetch).send({ messages, maxOutputTokens: 10 });
  expect(result).toMatchObject({ ok: false, category: 'UPSTREAM_RESPONSE_TOO_LARGE', attempts: 1 });
  expect(text).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('stops a streamed body that exceeds the byte cap without trusting content-length', async () => {
  const cancel = jest.fn();
  const read = jest.fn().mockResolvedValueOnce({ done: false, value: Buffer.alloc(MAX_RESPONSE_BYTES) })
    .mockResolvedValueOnce({ done: false, value: Buffer.from('x') });
  const fetch = jest.fn(async () => ({ status: 200, headers: { get: () => null }, body: { getReader: () => ({ read, cancel }) } }));
  expect(await transport(fetch).send({ messages, maxOutputTokens: 10 }))
    .toMatchObject({ ok: false, category: 'UPSTREAM_RESPONSE_TOO_LARGE' });
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(2);
});

test('forbids redirecting the authorization header', async () => {
  const fetch = jest.fn(async () => ({ status: 200, text: async () => '{}' }));
  await transport(fetch).send({ messages, maxOutputTokens: 10 });
  expect(fetch.mock.calls[0][1].redirect).toBe('error');
});
