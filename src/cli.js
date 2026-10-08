import { readFile } from 'node:fs/promises';
import { inspectSpec, compareSpecs } from './inspect.js';

const [command, first, second] = process.argv.slice(2);
try {
  if (command === 'inspect' && first && !second) {
    console.log(JSON.stringify(inspectSpec(await readFile(first, 'utf8')), null, 2));
  } else if (command === 'compare' && first && second) {
    console.log(JSON.stringify(compareSpecs(await readFile(first, 'utf8'), await readFile(second, 'utf8')), null, 2));
  } else {
    throw new Error('Usage: node src/cli.js inspect spec.json | compare before.json after.json');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
