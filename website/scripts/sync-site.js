const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'public', 'site');

const files = [
  'index.html',
  'doctor-login.html',
  'patient-login.html',
  'doctor-dashboard.html',
  'patient-dashboard.html',
  'create-account.html',
  'change-password.html',
  'site-sync.js',
  'supabase-init.js',
  'env.json',
  'Logo.png',
  'global-polyfills.js',
];

fs.mkdirSync(targetDir, { recursive: true });

let copied = 0;
for (const file of files) {
  const src = path.join(root, file);
  const dest = path.join(targetDir, file);
  if (!fs.existsSync(src)) {
    continue;
  }
  fs.copyFileSync(src, dest);
  copied++;
}

console.log(`Synced ${copied} site file(s) to public/site`);
