// CI gate before publishing the research feed. Usage: validate-feed.ts <new.json> [previous.json]
// Fails (exit 1) if the new file is invalid, or (with a previous file) not strictly newer than it.
import { readFileSync, statSync } from 'node:fs';
import { validateSummary } from '../src/bot/feedValidation';

const [file, prev] = process.argv.slice(2);
const text = readFileSync(file, 'utf8');
const json = JSON.parse(text);
const problems = validateSummary(json, Date.now(), statSync(file).size);
if (problems.length) {
  console.error('feed INVALID:\n- ' + problems.join('\n- '));
  process.exit(1);
}
if (prev) {
  const old = JSON.parse(readFileSync(prev, 'utf8'));
  if (!(Date.parse(json.generatedAt) > Date.parse(old.generatedAt))) {
    console.error(`feed NOT NEW: ${json.generatedAt} <= ${old.generatedAt} (research did not produce a new run)`);
    process.exit(1);
  }
}
console.log(`feed OK: generatedAt ${json.generatedAt}, ${json.runs.length} runs`);
