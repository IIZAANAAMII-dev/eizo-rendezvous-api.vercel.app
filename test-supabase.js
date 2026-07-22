// Test script for Supabase integration
// Run with: node test-supabase.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('=== Test Supabase Integration ===\n');

// 1. Check environment variables
console.log('1. Checking environment variables...');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set');
  process.exit(1);
}
console.log('✅ SUPABASE_URL is set');

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}
console.log('✅ SUPABASE_SERVICE_ROLE_KEY is set');

// 2. Create Supabase client
console.log('\n2. Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client created');

// 3. Test connection and table existence
async function testSupabase() {
  try {
    console.log('\n3. Testing connection to shopify_connections table...');
    
    // Try to read from the table to check if it exists
    const { data, error } = await supabase
      .from('shopify_connections')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Table shopify_connections does not exist');
        console.error('Please run the SQL migration script first');
      } else if (error.code === '42501') {
        console.error('❌ RLS (Row Level Security) is blocking access');
        console.error('Error:', error.message);
      } else {
        console.error('❌ Error accessing table:', error.message);
      }
      process.exit(1);
    }
    
    console.log('✅ Table shopify_connections exists and is accessible');

    // 4. Test insertion
    console.log('\n4. Testing insertion...');
    const testShopDomain = 'test-shop.myshopify.com';
    const testToken = 'test_token_' + Date.now();
    
    const { data: insertData, error: insertError } = await supabase
      .from('shopify_connections')
      .upsert(
        { shop_domain: testShopDomain, access_token: testToken },
        { onConflict: 'shop_domain' }
      );
    
    if (insertError) {
      console.error('❌ Insertion failed:', insertError.message);
      process.exit(1);
    }
    
    console.log('✅ Insertion successful');

    // 5. Test retrieval
    console.log('\n5. Testing retrieval...');
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('shopify_connections')
      .select('access_token')
      .eq('shop_domain', testShopDomain)
      .single();
    
    if (retrieveError || !retrieveData) {
      console.error('❌ Retrieval failed:', retrieveError?.message);
      process.exit(1);
    }
    
    if (retrieveData.access_token !== testToken) {
      console.error('❌ Retrieved token does not match');
      process.exit(1);
    }
    
    console.log('✅ Retrieval successful');
    console.log('✅ Token matches');

    // 6. Cleanup test data
    console.log('\n6. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('shopify_connections')
      .delete()
      .eq('shop_domain', testShopDomain);
    
    if (deleteError) {
      console.warn('⚠️  Cleanup failed (non-critical):', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n=== All tests passed! ===');
    console.log('Supabase integration is working correctly.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testSupabase();
