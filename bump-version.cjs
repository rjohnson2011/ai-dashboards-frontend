#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'src', 'version.ts');

// Get the increment type from command line argument
const incrementType = process.argv[2] || 'patch';

// Read current version
const content = fs.readFileSync(versionFile, 'utf8');
const versionMatch = content.match(/version:\s*"(\d+)\.(\d+)(?:\.(\d+))?"/);

if (!versionMatch) {
  console.error('Could not find version in version.ts');
  process.exit(1);
}

const major = parseInt(versionMatch[1]);
const minor = parseInt(versionMatch[2]);
const patch = parseInt(versionMatch[3] || '0');

let newVersion;

switch (incrementType) {
  case 'major':
    // 1.7.2 -> 2.0.0
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    // 1.7.2 -> 1.8.0
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    // 1.7.2 -> 1.7.3
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

const newTimestamp = new Date().toISOString();

// Update version file
const newContent = `export const APP_VERSION = {
  version: "${newVersion}",
  timestamp: "${newTimestamp}"
};`;

fs.writeFileSync(versionFile, newContent);

console.log(`Version bumped from ${major}.${minor}.${patch} to ${newVersion}`);
console.log(`Timestamp: ${newTimestamp}`);
console.log(`Increment type: ${incrementType}`);