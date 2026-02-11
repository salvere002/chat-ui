import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const distDir = path.resolve(process.cwd(), 'dist');
const forbiddenPatterns = ['__VITE_PRELOAD__', '__vitePreload', '__vite__mapDeps'];
const textExtensions = new Set(['.js', '.mjs', '.cjs', '.html']);

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) continue;
    files.push(fullPath);
  }

  return files;
}

const findings = [];
const files = collectFiles(distDir);

for (const filePath of files) {
  const source = readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of forbiddenPatterns) {
      if (!line.includes(pattern)) continue;
      findings.push({
        filePath: path.relative(process.cwd(), filePath),
        line: index + 1,
        pattern,
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Preload helper assertion failed. Forbidden markers found in dist output:\n');
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} contains "${finding.pattern}"`);
  }
  process.exit(1);
}

console.log('Preload helper assertion passed.');
