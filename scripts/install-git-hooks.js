import { writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const hookDir = join(root, '.git', 'hooks');
const hookPath = join(hookDir, 'post-commit');

const script = `#!/bin/sh
# Auto-push after commit
echo "Running post-commit: pushing to origin..."
git push origin HEAD || echo "git push failed"
`;

try {
  writeFileSync(hookPath, script, { mode: 0o755 });
  console.log('Installed post-commit hook at', hookPath);
} catch (err) {
  console.error('Failed to install git hook:', err);
  process.exitCode = 1;
}
