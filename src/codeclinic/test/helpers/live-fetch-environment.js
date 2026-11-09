// Jest environment for the opt-in live SoCLaaS test only (spec ai-ta-assist v0.2, "Live verification").
// CRA's Jest 27 node environment does not expose Node's built-in fetch, so the real transport would
// see no fetch and the gateway would report AI_UNAVAILABLE. This passes the host Node's own fetch
// (and the web-stream helpers the transport needs) into the test context. Test-only; no dependency.
const NodeEnvironment = require('jest-environment-node');

const HOST_GLOBALS = ['fetch', 'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal', 'TextDecoder', 'TextEncoder'];

class LiveFetchEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    for (const name of HOST_GLOBALS) {
      if (typeof this.global[name] === 'undefined' && typeof globalThis[name] !== 'undefined') {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = LiveFetchEnvironment;
