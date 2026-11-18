const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building frontend from root...');
execSync('npm --prefix frontend install', { stdio: 'inherit' });
execSync('npm --prefix frontend run build', { stdio: 'inherit' });

const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'dist');

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

fs.cpSync(src, dest, { recursive: true });
console.log('Build completed successfully!');
