'use strict';
// POST /insights: Queue Insights for the TA queue (spec ai-ta-assist v0.2, R4, R5; scenarios 5-9, 11).
// Mounted by `ta-routes.js` after `requireActiveActor` and the TA check. Read-only: no store writes.
// The gateway is read from `req.app.locals.aiGateway` per request; a missing gateway is `AI_UNAVAILABLE`.
const express = require('express');
const { QUEUE_INSIGHTS, createInsightsCache } = require('./ta-ai-insights');
const { toAiErrorResponse, buildAliasMap, cleanInsightGroups, requireEmptyJsonBody } = require('./ta-ai-shared');

const MAX_TICKETS = 60;

/** Collects up to MAX_TICKETS + 1 active tickets, oldest first, following store cursors. */
async function collectActive(ticketStore) {
  const collected = [];
  let cursor;
  do {
    const page = await ticketStore.listTickets({ status: 'ACTIVE', cursor });
    collected.push(...page.tickets);
    cursor = page.nextCursor || undefined;
  } while (cursor && collected.length <= MAX_TICKETS);
  return collected.slice(0, MAX_TICKETS + 1);
}

/** @param {{ requireCsrf: Function, ticketStore: object, safe: Function }} shared */
function createAiInsightsRoutes(shared) {
  const { requireCsrf, ticketStore, safe } = shared;
  const cache = createInsightsCache();
  const router = express.Router();

  router.post('/insights', requireCsrf, requireEmptyJsonBody, safe(async (req, res) => {
    const fail = (code) => {
      const mapped = toAiErrorResponse(code, 'QUEUE_INSIGHTS');
      return res.status(mapped.status).json(mapped.body);
    };
    const all = await collectActive(ticketStore);
    const truncated = all.length > MAX_TICKETS;
    const tickets = all.slice(0, MAX_TICKETS);
    if (tickets.length === 0) return res.status(200).json({ groups: [], ticketCount: 0, truncated: false, cached: false });

    const aliasMap = buildAliasMap(tickets);
    const key = `${cache.keyFor(aliasMap)}|${truncated}`;
    const hit = cache.get(key);
    if (hit) return res.status(200).json({ ...hit, cached: true });

    const gateway = req.app && req.app.locals && req.app.locals.aiGateway;
    if (!gateway || typeof gateway.run !== 'function') return fail('AI_UNAVAILABLE');

    let result;
    try {
      result = await gateway.run({
        feature: QUEUE_INSIGHTS.feature,
        actor: { userId: req.actor.userId, accountType: req.actor.accountType },
        input: {
          tickets: Array.from(aliasMap.entries()).map(([alias, t]) => ({
            alias, language: t.language, conceptTags: t.conceptTags, title: t.title, errorOutput: t.errorOutput,
          })),
        },
      });
    } catch (error) {
      return fail('AI_UNAVAILABLE');
    }
    if (!result || result.ok !== true) return fail(result && result.code);

    const groups = cleanInsightGroups(result.data && result.data.groups, aliasMap);
    const body = { groups, ticketCount: tickets.length, truncated };
    cache.set(key, body);
    return res.status(200).json({ ...body, cached: false });
  }));

  return router;
}

module.exports = { createAiInsightsRoutes };
