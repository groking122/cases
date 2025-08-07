#!/usr/bin/env node

/**
 * Test admin APIs to verify they're working
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAdminAPIs() {
  console.log('🧪 Testing Admin APIs...')

  try {
    // Test 1: Check if symbols table has value column
    console.log('\n1️⃣ Testing symbols table...')
    
    const { data: symbols, error: symbolsError } = await supabase
      .from('symbols')
      .select('id, name, value')
      .limit(1)

    if (symbolsError) {
      console.error('❌ Symbols table error:', symbolsError.message)
      if (symbolsError.message.includes('value')) {
        console.log('💡 The value column is missing! Run this SQL in Supabase:')
        console.log('ALTER TABLE symbols ADD COLUMN IF NOT EXISTS value DECIMAL(10,2) NOT NULL DEFAULT 10.00 CHECK (value >= 0);')
      }
    } else {
      console.log('✅ Symbols table is accessible')
      if (symbols && symbols.length > 0) {
        console.log('   Sample symbol:', symbols[0])
      }
    }

    // Test 2: Check cases table
    console.log('\n2️⃣ Testing cases table...')
    
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, name, price')
      .limit(1)

    if (casesError) {
      console.error('❌ Cases table error:', casesError.message)
    } else {
      console.log('✅ Cases table is accessible')
      if (cases && cases.length > 0) {
        console.log('   Sample case:', cases[0])
      }
    }

    // Test 3: Test creating a symbol
    console.log('\n3️⃣ Testing symbol creation...')
    
    const testSymbol = {
      name: 'Test Symbol',
      description: 'Test description',
      image_url: 'https://example.com/test.png',
      rarity: 'common',
      value: 10.00,
      is_active: true
    }

    const { data: createdSymbol, error: createError } = await supabase
      .from('symbols')
      .insert(testSymbol)
      .select()
      .single()

    if (createError) {
      console.error('❌ Symbol creation error:', createError.message)
    } else {
      console.log('✅ Symbol created successfully:', createdSymbol.id)
      
      // Test updating the symbol
      const { data: updatedSymbol, error: updateError } = await supabase
        .from('symbols')
        .update({ name: 'Updated Test Symbol', value: 15.00 })
        .eq('id', createdSymbol.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Symbol update error:', updateError.message)
      } else {
        console.log('✅ Symbol updated successfully')
      }

      // Clean up
      const { error: deleteError } = await supabase
        .from('symbols')
        .delete()
        .eq('id', createdSymbol.id)

      if (deleteError) {
        console.error('❌ Symbol deletion error:', deleteError.message)
      } else {
        console.log('✅ Test symbol cleaned up')
      }
    }

    console.log('\n🎉 Admin API tests complete!')
    console.log('\n💡 If all tests passed, your admin panel should work at:')
    console.log('   http://localhost:3000/admin')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the tests
testAdminAPIs() 