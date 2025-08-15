import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    // Get all tables and their columns
    const { data: tables, error: tablesError } = await supabaseAdmin
      .rpc('get_table_schema_info')

    if (tablesError) {
      console.error('Error fetching schema:', tablesError)
      
      // Fallback: Get basic table info
      const { data: basicTables, error: basicError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .order('table_name')

      if (basicError) {
        return NextResponse.json({ error: 'Failed to fetch database schema' }, { status: 500 })
      }

      return NextResponse.json({ 
        tables: basicTables,
        note: 'Basic table list only - full schema function not available'
      })
    }

    return NextResponse.json({ tables })

  } catch (error) {
    console.error('Error fetching database schema:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create the schema function if it doesn't exist
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    const createSchemaFunction = `
      CREATE OR REPLACE FUNCTION get_table_schema_info()
      RETURNS TABLE(
        table_name TEXT,
        column_name TEXT,
        data_type TEXT,
        is_nullable TEXT,
        column_default TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.table_name::TEXT,
          c.column_name::TEXT,
          c.data_type::TEXT,
          c.is_nullable::TEXT,
          c.column_default::TEXT
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createSchemaFunction })

    if (error) {
      console.error('Error creating schema function:', error)
      return NextResponse.json({ error: 'Failed to create schema function' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Schema function created' })

  } catch (error) {
    console.error('Error creating schema function:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
