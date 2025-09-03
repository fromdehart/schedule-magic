#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('📊 Bundle Analysis...\n');

// Check if dist folder exists
if (!fs.existsSync('dist')) {
  console.log('❌ No build found. Run "npm run build" first.');
  process.exit(1);
}

// Analyze bundle sizes
try {
  const distPath = 'dist/assets';
  const files = fs.readdirSync(distPath);
  
  const bundleInfo = [];
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(3);
      
      bundleInfo.push({
        file,
        sizeKB: parseFloat(sizeKB),
        sizeMB: parseFloat(sizeMB),
        sizeBytes: stats.size
      });
    }
  });
  
  // Sort by size (largest first)
  bundleInfo.sort((a, b) => b.sizeBytes - a.sizeBytes);
  
  console.log('📦 Bundle Analysis Results:');
  console.log('============================');
  
  bundleInfo.forEach(({ file, sizeKB, sizeMB }) => {
    const sizeDisplay = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
    console.log(`  ${file}: ${sizeDisplay}`);
  });
  
  // Calculate totals
  const totalSize = bundleInfo.reduce((sum, { sizeBytes }) => sum + sizeBytes, 0);
  const totalKB = (totalSize / 1024).toFixed(2);
  const totalMB = (totalSize / (1024 * 1024)).toFixed(3);
  
  console.log('\n📊 Total Bundle Size:');
  console.log(`  ${totalKB} KB (${totalMB} MB)`);
  
  // Recommendations
  console.log('\n💡 Optimization Recommendations:');
  
  if (totalSize > 500 * 1024) { // 500KB
    console.log('  ⚠️  Bundle is large. Consider:');
    console.log('     - Code splitting with React.lazy()');
    console.log('     - Tree shaking unused dependencies');
    console.log('     - Using dynamic imports for routes');
  }
  
  const largeFiles = bundleInfo.filter(({ sizeMB }) => sizeMB > 1);
  if (largeFiles.length > 0) {
    console.log('  ⚠️  Large files detected:');
    largeFiles.forEach(({ file, sizeMB }) => {
      console.log(`     - ${file}: ${sizeMB} MB`);
    });
  }
  
  console.log('\n✅ Bundle analysis completed!');
  
} catch (error) {
  console.log('❌ Error analyzing bundle:', error.message);
}
