import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const green = '\u001b[32m';
const red = '\u001b[31m';
const reset = '\u001b[0m';

function logSuccess(msg) {
  console.log(`${green}✔ ${msg}${reset}`);
}

function logFail(msg) {
  console.error(`${red}✘ ${msg}${reset}`);
}

let hasError = false;

// Node version
const nodeVersion = process.version;
logSuccess(`Node version: ${nodeVersion}`);

// package.json
if (fs.existsSync('package.json')) {
  logSuccess('package.json exists');
} else {
  logFail('package.json missing');
  hasError = true;
}

// node_modules
if (fs.existsSync('node_modules')) {
  logSuccess('node_modules installed');
} else {
  logFail('node_modules missing');
  hasError = true;
}

const requiredDirs = ['schema', 'templates', 'assets', 'components', 'src', 'output'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    logSuccess(`${dir}/ exists`);
  } else {
    logFail(`${dir}/ missing`);
    hasError = true;
  }
});

if (hasError) {
  console.error(`${red}Assessment Engine health check failed.${reset}`);
  process.exit(1);
} else {
  console.log(`${green}✔ Assessment Engine is healthy.${reset}`);
  process.exit(0);
}
