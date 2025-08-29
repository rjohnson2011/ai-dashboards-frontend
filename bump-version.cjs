#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'src', 'version.ts');

// Read current version
const content = fs.readFileSync(versionFile, 'utf8');
const versionMatch = content.match(/version:\s*"(\d+)\.(\d+)"/);

if (!versionMatch) {
  console.error('Could not find version in version.ts');
  process.exit(1);
}

const major = parseInt(versionMatch[1]);
const minor = parseInt(versionMatch[2]);

// Increment minor version
const newVersion = `${major}.${minor + 1}`;
const newTimestamp = new Date().toISOString();

// Update version file
const newContent = `export const APP_VERSION = {
  version: "${newVersion}",
  timestamp: "${newTimestamp}"
};`;

fs.writeFileSync(versionFile, newContent);

console.log(`Version bumped from ${major}.${minor} to ${newVersion}`);
console.log(`Timestamp: ${newTimestamp}`);