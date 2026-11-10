const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'build');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function isWithinRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/auth/session') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ accountType: 'STUDENT', name: 'Synthetic T04 Student' })); return; }
  if (req.url === '/api/auth/csrf') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ csrfToken: 'synthetic-browser-inspection-token' })); return; }
  if (req.url === '/api/tickets' && req.method === 'POST') { req.resume(); res.writeHead(201, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ticketId: 'synthetic-browser-inspection-ticket' })); return; }
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (!isWithinRoot(root, candidate)) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

if (require.main === module) server.listen(3105, '127.0.0.1');

module.exports = { isWithinRoot, root, server };

