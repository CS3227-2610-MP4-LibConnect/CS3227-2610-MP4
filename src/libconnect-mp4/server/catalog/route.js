const { parseCatalogQuery } = require('./contract');
const { readCatalogPage } = require('./adapter');

function errorResponse(response, status, code) {
  return response.status(status).json({ error: { code } });
}

function createCatalogHandler(db, authenticateRequest) {
  if (!db || typeof db.collection !== 'function' || typeof authenticateRequest !== 'function') {
    throw new TypeError('Catalog storage and session authentication are required.');
  }
  return async (request, response) => {
    response.set('Cache-Control', 'no-store');
    let auth;
    try { auth = await authenticateRequest(request, response); }
    catch (_) { return errorResponse(response, 503, 'CATALOG_UNAVAILABLE'); }
    if (!auth) return errorResponse(response, 401, 'UNAUTHENTICATED');
    if (auth.accountType !== 'MEMBER') return errorResponse(response, 403, 'FORBIDDEN');
    const query = parseCatalogQuery(request.originalUrl);
    if (!query) return errorResponse(response, 400, 'INVALID_QUERY');
    try {
      return response.status(200).json(await readCatalogPage(db, query));
    } catch (_) {
      return errorResponse(response, 503, 'CATALOG_UNAVAILABLE');
    }
  };
}

module.exports = { createCatalogHandler };
