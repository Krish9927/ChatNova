/**
 * Test PostgreSQL connection and dm_messages table
 * Run with: node test-postgres.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('🔍 Testing PostgreSQL Connection\n');
console.log('='.repeat(50));

// Get DATABASE_URL from .env
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL not found in .env file!');
  console.log('\nAdd this to your .env file:');
  console.log('DATABASE_URL=postgresql://username:password@localhost:5432/chatnova');
  process.exit(1);
}

console.log(`\nConnecting to: ${DATABASE_URL.replace(/:([^:@]+)@/, ':***@')}`);

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('\n✓ Testing connection...');
    const client = await pool.connect();
    console.log('  ✅ Connected to PostgreSQL');
    
    // Test 2: Check if dm_messages table exists
    console.log('\n✓ Checking dm_messages table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'dm_messages'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('  ✅ dm_messages table exists');
      
      // Test 3: Check table structure
      console.log('\n✓ Checking table columns...');
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dm_messages'
        ORDER BY ordinal_position;
      `);
      
      console.log('  Columns:');
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type}`);
      });
      
      // Test 4: Count messages
      console.log('\n✓ Counting messages...');
      const count = await client.query('SELECT COUNT(*) FROM dm_messages');
      console.log(`  ✅ Total messages in database: ${count.rows[0].count}`);
      
      // Test 5: Test query
      console.log('\n✓ Testing SELECT query...');
      const test = await client.query(`
        SELECT * FROM dm_messages 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log(`  ✅ Query successful, got ${test.rows.length} rows`);
      
      if (test.rows.length > 0) {
        console.log('\n  Sample message:');
        console.log(`    ID: ${test.rows[0].id}`);
        console.log(`    Sender: ${test.rows[0].sender_id}`);
        console.log(`    Receiver: ${test.rows[0].receiver_id || 'N/A (group)'}`);
        console.log(`    Text: ${test.rows[0].text || 'N/A'}`);
      }
      
    } else {
      console.log('  ❌ dm_messages table NOT FOUND!');
      console.log('\n  The table needs to be created. Run:');
      console.log('    cd backend');
      console.log('    npm start');
      console.log('  The server will create the table automatically.');
    }
    
    client.release();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetails:', {
      code: error.code,
      detail: error.detail
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution:');
      console.log('  PostgreSQL is not running. Start it:');
      console.log('    - Windows: net start postgresql-x64-14');
      console.log('    - Docker: docker-compose up -d');
    } else if (error.code === '28P01') {
      console.log('\n💡 Solution:');
      console.log('  Authentication failed. Check your DATABASE_URL');
      console.log('  Make sure username and password are correct.');
    } else if (error.code === '3D000') {
      console.log('\n💡 Solution:');
      console.log('  Database does not exist. Create it:');
      console.log('    psql -U postgres');
      console.log('    CREATE DATABASE chatnova;');
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('\nTest complete!\n');
});
