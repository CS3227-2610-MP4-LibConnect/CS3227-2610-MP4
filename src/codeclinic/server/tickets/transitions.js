// Pure state-machine guard (spec ta-ticket-queue v0.1, section C2).
const REFUSED = Object.freeze({ allowed: false });

/**
 * Decides whether `actor` may apply `event` to a ticket.
 * Events: claim, unclaim, resolve, close, reply. `reply` keeps the status.
 * @returns {{ allowed: true, to: string } | { allowed: false }}
 */
function evaluateTransition(input) {
  const { event, status, claimedByTaId, actor, studentId } = input || {};
  if (!actor || typeof actor.userId !== 'string' || !actor.userId) return { ...REFUSED };
  const isTa = actor.accountType === 'TA';
  const isStudent = actor.accountType === 'STUDENT';
  const holdsClaim = status === 'CLAIMED' && typeof claimedByTaId === 'string'
    && claimedByTaId !== '' && claimedByTaId === actor.userId;
  const open = status === 'OPEN' || status === 'CLAIMED';

  if (event === 'claim' && isTa && status === 'OPEN') return { allowed: true, to: 'CLAIMED' };
  if (event === 'unclaim' && isTa && holdsClaim) return { allowed: true, to: 'OPEN' };
  if (event === 'resolve' && isTa && holdsClaim) return { allowed: true, to: 'RESOLVED' };
  if (event === 'close' && isStudent && open
    && typeof studentId === 'string' && studentId !== '' && studentId === actor.userId) {
    return { allowed: true, to: 'CLOSED' };
  }
  if (event === 'reply' && isTa && open) return { allowed: true, to: status };
  return { ...REFUSED };
}

module.exports = { evaluateTransition };
