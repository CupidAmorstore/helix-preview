const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', 'android', 'ios']);
const HTML_EXT = '.html';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith(HTML_EXT)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function isExternal(ref) {
  return ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:') || ref.startsWith('//');
}

function cleanRef(ref) {
  return ref.split('#')[0].split('?')[0];
}

const htmlFiles = walk(ROOT);
const missing = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const matches = [...html.matchAll(/(?:href|src)="([^"]+)"/g)];
  for (const m of matches) {
    const raw = m[1];
    if (!raw || raw === '#' || raw.startsWith('#')) continue;
    if (isExternal(raw)) continue;

    const ref = cleanRef(raw);
    if (!ref) continue;

    let target;
    if (ref.startsWith('/')) {
      target = path.join(ROOT, ref);
    } else {
      target = path.resolve(path.dirname(file), ref);
    }

    if (!fs.existsSync(target)) {
      missing.push({ file, ref });
    }
  }
}

if (missing.length) {
  console.error('Missing referenced files:');
  for (const item of missing) {
    console.error(`- ${item.file} -> ${item.ref}`);
  }
  process.exit(1);
}

console.log(`verify-assets: OK (${htmlFiles.length} HTML files checked)`);
