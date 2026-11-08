/** @jest-environment node */
const fs = require('fs');
const path = require('path');

function browserFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? browserFiles(name) : [name];
  });
}

test('browser source cannot import the AI server or reference provider configuration', () => {
  const violations = browserFiles(path.join(__dirname, '../src')).filter(file =>
    /soclaas|SOCLAAS_|server\/ai/i.test(fs.readFileSync(file, 'utf8')));
  expect(violations).toEqual([]);
});
