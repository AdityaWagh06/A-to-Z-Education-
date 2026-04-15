/**
 * Database Column Verification Script
 * Run: node server/verify-database.js
 * 
 * This script checks if all required database columns exist in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const tableSchema = {
  users: [
    'id', 'name', 'email', 'google_id', 'role', 'standard',
    'progress', 'purchased_tests', 'purchased_standard_boxes',
    'mobile_no', 'picture', 'last_login_at', 'created_at', 'updated_at'
  ],
  videos: [
    'id', 'title', 'youtube_url', 'thumbnail', 'subject',
    'standard', 'duration', 'created_at'
  ],
  tests: [
    'id', 'title', 'subject', 'standard', 'price', 'questions',
    'time_limit', 'is_locked', 'pdf_path', 'answer_sheet_path', 'created_at'
  ],
  announcements: [
    'id', 'title', 'description', 'link', 'active', 'created_at'
  ],
  payments: [
    'id', 'user_id', 'test_id', 'box_id', 'payment_type',
    'standard_value', 'razorpay_order_id', 'razorpay_payment_id',
    'amount', 'status', 'created_at'
  ],
  paid_standard_boxes: [
    'id', 'standard', 'title', 'description', 'amount', 'is_active', 'created_at'
  ],
  paid_standard_box_tests: [
    'box_id', 'test_id', 'created_at'
  ]
};

async function verifyDatabase() {
  console.log('🔍 Verifying Database Schema...\n');
  
  let allTablesOk = true;
  let totalIssues = 0;

  for (const [tableName, requiredColumns] of Object.entries(tableSchema)) {
    try {
      // Try to fetch one row to check table and columns
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST103' || error.message.includes('not found')) {
          console.log(`❌ TABLE MISSING: ${tableName}`);
          allTablesOk = false;
          totalIssues++;
        } else {
          console.log(`⚠️  ERROR checking ${tableName}:`, error.message);
          totalIssues++;
        }
        continue;
      }

      // Check which columns are missing
      const missingColumns = [];
      if (data && data.length > 0) {
        requiredColumns.forEach(col => {
          if (!(col in data[0])) {
            missingColumns.push(col);
          }
        });
      }

      if (missingColumns.length > 0) {
        console.log(`❌ TABLE: ${tableName}`);
        console.log(`   Missing columns: ${missingColumns.join(', ')}`);
        allTablesOk = false;
        totalIssues += missingColumns.length;
      } else {
        console.log(`✅ TABLE: ${tableName} - All ${requiredColumns.length} columns present`);
      }
    } catch (error) {
      console.log(`❌ EXCEPTION checking ${tableName}:`, error.message);
      allTablesOk = false;
      totalIssues++;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allTablesOk) {
    console.log('✅ Database schema verification PASSED');
    console.log('All required tables and columns are present.');
  } else {
    console.log(`❌ Database schema verification FAILED`);
    console.log(`Found ${totalIssues} issue(s). Please fix them before deployment.`);
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allTablesOk ? 0 : 1);
}

verifyDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
