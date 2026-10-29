'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
for (const test of ['simulate', 'signature', 'stop', 'delete', 'regression', 'audit']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test + '.js')], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error('FAIL ' + test, result.stdout, result.stderr, result.error || '');
    process.exit(1);
  }
  console.log('PASS ' + test);
}
for (const file of fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => 'src/' + f)
  .concat(['bilibili-lottery-cleaner.user.js'])) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr, result.error || ''); process.exit(1); }
}
console.log('PASS source and userscript syntax');
