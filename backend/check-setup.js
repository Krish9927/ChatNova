/**
 * Diagnostic script to verify ChatNova backend setup
 * Run with: node check-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 ChatNova Backend Setup Checker\n');
console.log('='.repeat(50));

let allGood = true;

// Check 1: Required files exist
console.log('\n✓ Checking required files...');
const requiredFiles = [
  'src/controllers/dashboard.controller.js',
  'src/routes/dashboard.route.js',
  'src/server.js',
  '.env'
];

requiredFiles.forEach(file => {
  const filepath = path.join(__dirname, file);
  if (fs.existsSync(filepath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allGood = false;
  }
});

// Check 2: Verify dashboard route is imported in server.js
console.log('\n✓ Checking server.js configuration...');
const serverPath = path.join(__dirname, 'src/server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  
  if (serverContent.includes("import dashboardRoutes from './routes/dashboard.route.js'")) {
    console.log('  ✅ Dashboard routes imported');
  } else {
    console.log('  ❌ Dashboard routes NOT imported in server.js');
    allGood = false;
  }
  
  if (serverContent.includes('app.use("/api/dashboard", dashboardRoutes)')) {
    console.log('  ✅ Dashboard routes registered');
  } else {
    console.log('  ❌ Dashboard routes NOT registered in server.js');
    allGood = false;
  }
}

// Check 3: Verify .env file has required variables
console.log('\n✓ Checking environment variables...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = ['PORT', 'MONGODB_URI', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'CLIENT_URL'];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ⚠️  ${varName} - not found in .env`);
    }
  });
}

// Check 4: Verify package.json has required dependencies
console.log('\n✓ Checking dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const requiredDeps = ['express', 'mongoose', 'pg', 'redis', 'socket.io'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - not installed`);
      allGood = false;
    }
  });
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('\n✅ All checks passed! Your backend is ready.');
  console.log('\nNext steps:');
  console.log('  1. Make sure MongoDB, PostgreSQL, and Redis are running');
  console.log('  2. Run: npm start');
  console.log('  3. Visit: http://localhost:3000/api/dashboard (after login)');
} else {
  console.log('\n❌ Some issues found. Please fix them and try again.');
  console.log('\nSee START_APP.md for detailed setup instructions.');
}
console.log('='.repeat(50) + '\n');
