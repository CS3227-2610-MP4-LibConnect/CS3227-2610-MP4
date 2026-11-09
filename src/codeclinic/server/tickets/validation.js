const LANGUAGES = Object.freeze(['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other']);
const ALLOWED_FIELDS = new Set([
  'title', 'language', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'errorOutput',
  'conceptTags', 'files', 'repoUrl', 'repoFilePaths',
]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function characterLength(value) {
  return Array.from(value).length;
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateTicketInput(body) {
  if (!isRecord(body)) return null;
  if (Object.keys(body).some((key) => !ALLOWED_FIELDS.has(key))) return null;

  const required = ['title', 'expectedBehaviour', 'actualBehaviour', 'attempted'];
  const text = {};
  for (const field of required) {
    if (typeof body[field] !== 'string') return null;
    const value = body[field].trim();
    const max = field === 'title' ? 255 : 5000;
    if (characterLength(value) < 1 || characterLength(value) > max) return null;
    text[field] = value;
  }
  if (!LANGUAGES.includes(body.language)) return null;

  let errorOutput = null;
  if (body.errorOutput !== undefined) {
    if (typeof body.errorOutput !== 'string') return null;
    errorOutput = body.errorOutput.trim();
    if (characterLength(errorOutput) > 5000) return null;
  }

  let conceptTags = [];
  if (body.conceptTags !== undefined) {
    if (!Array.isArray(body.conceptTags) || body.conceptTags.length > 5) return null;
    conceptTags = [];
    const seen = new Set();
    for (const tag of body.conceptTags) {
      if (typeof tag !== 'string') return null;
      const normalized = tag.trim().toLowerCase();
      if (characterLength(normalized) < 1 || characterLength(normalized) > 30 || seen.has(normalized)) return null;
      seen.add(normalized);
      conceptTags.push(normalized);
    }
  }

  let files = [];
  if (body.files !== undefined) {
    if (!Array.isArray(body.files) || body.files.length > 3) return null;
    files = [];
    for (const file of body.files) {
      if (!isRecord(file) || Object.keys(file).some((key) => !['filename', 'content'].includes(key)) ||
          typeof file.filename !== 'string' || typeof file.content !== 'string') return null;
      const { filename, content } = file;
      if (filename.trim().length < 1 || characterLength(filename) > 120 || filename === '.' || filename === '..' ||
          filename.includes('/') || filename.includes('\\') || CONTROL_CHARACTERS.test(filename) ||
          Buffer.byteLength(content, 'utf8') > 24 * 1024) return null;
      files.push({ filename, content });
    }
  }

  let repoUrl = null;
  let repoFilePaths = [];
  if (body.repoUrl !== undefined) {
    if (body.files !== undefined) return null;
    if (typeof body.repoUrl !== 'string' || characterLength(body.repoUrl) > 255 ||
        CONTROL_CHARACTERS.test(body.repoUrl)) return null;
    let parsed;
    try { parsed = new URL(body.repoUrl); } catch (error) { return null; }
    const segments = parsed.pathname.split('/').filter(Boolean);
    const authority = /^https:\/\/([^/]+)/i.exec(body.repoUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.username || parsed.password ||
        !authority || authority[1].includes('@') || body.repoUrl.includes('?') || body.repoUrl.includes('#') ||
        parsed.search || parsed.hash || segments.length !== 2 ||
        segments.some((segment) => segment === '.' || segment === '..')) return null;
    if (!Array.isArray(body.repoFilePaths) || body.repoFilePaths.length < 1 || body.repoFilePaths.length > 10) return null;
    let totalPathLength = 0;
    for (const filePath of body.repoFilePaths) {
      if (typeof filePath !== 'string' || filePath.trim().length < 1 || CONTROL_CHARACTERS.test(filePath) ||
          filePath.startsWith('/') || filePath.startsWith('\\') || /^[A-Za-z]:/.test(filePath)) return null;
      const parts = filePath.split(/[\\/]/);
      if (parts.some((part) => part === '.' || part === '..')) return null;
      totalPathLength += characterLength(filePath);
    }
    if (totalPathLength > 5000) return null;
    repoUrl = body.repoUrl;
    repoFilePaths = body.repoFilePaths.slice();
  } else if (body.repoFilePaths !== undefined) {
    return null;
  }

  return {
    ...text,
    language: body.language,
    conceptTags,
    files,
    repoUrl,
    repoFilePaths,
    errorOutput,
  };
}

module.exports = { LANGUAGES, validateTicketInput };
