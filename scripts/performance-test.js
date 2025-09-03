#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Performance Testing...\n');

// Check if dist folder exists (indicating successful build)
if (!fs.existsSync('dist')) {
  console.log('❌ No build found. Run "npm run optimize" first.');
  process.exit(1);
}

// Check bundle sizes
console.log('📊 Bundle Analysis:');
try {
  const distPath = 'dist/assets';
  const files = fs.readdirSync(distPath);
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      const stats = fs.statSync(`${distPath}/${file}`);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ${file}: ${sizeKB} KB`);
    }
  });
} catch (error) {
  console.log('  Could not analyze bundle sizes');
}

console.log('\n✅ Performance test completed!');
console.log('💡 Start dev server with: npm run dev:fast');
console.log('📈 Monitor performance in browser dev tools');
