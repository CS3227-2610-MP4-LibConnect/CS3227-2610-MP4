// Shared ticket contract constants (spec ta-ticket-queue v0.1, section C1, Q1).
const STATUSES = Object.freeze(['OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED']);
const LANGUAGES = Object.freeze(['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other']);

const PAGE_SIZE = 20;
const MAX_REPLIES = 200;
const MAX_REPLY_LENGTH = 4000;
const MAX_FIX_NOTE_LENGTH = 2000;
const MAX_CONCEPT_TAGS = 5;
const MAX_TAG_LENGTH = 30;

/** True for an array of 0-5 lowercase, trimmed strings of 1-30 characters. */
function isValidConceptTags(tags) {
  if (!Array.isArray(tags) || tags.length > MAX_CONCEPT_TAGS) return false;
  return tags.every((tag) => typeof tag === 'string'
    && tag.length >= 1
    && tag.length <= MAX_TAG_LENGTH
    && tag === tag.trim()
    && tag === tag.toLowerCase());
}

const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

module.exports = {
  TICKET_ID_PATTERN,
  STATUSES,
  LANGUAGES,
  PAGE_SIZE,
  MAX_REPLIES,
  MAX_REPLY_LENGTH,
  MAX_FIX_NOTE_LENGTH,
  MAX_CONCEPT_TAGS,
  MAX_TAG_LENGTH,
  isValidConceptTags,
};
