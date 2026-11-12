const fs = require('fs');
const path = require('path');

// Spec workflow/specs/environments-and-deployment.md R3: the browser never accesses Firestore,
// so the rules deny every client read and write. The server's Admin SDK is not subject to them.
const root = path.join(__dirname, '..');
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const code = rules.replace(/\/\/.*$/gm, '');

describe('Firestore security rules', () => {
  test('firebase.json references firestore.rules, so the emulator and deploys load it', () => {
    expect(firebaseConfig.firestore.rules).toBe('firestore.rules');
  });

  test('every document is matched and every client read and write is denied', () => {
    expect(code).toMatch(/rules_version\s*=\s*'2'/);
    expect(code).toMatch(/match \/databases\/\{database\}\/documents/);
    expect(code).toMatch(/match \/\{document=\*\*\}/);
    const allows = code.match(/allow[^;]*;/g);
    expect(allows).toEqual(['allow read, write: if false;']);
  });
});
