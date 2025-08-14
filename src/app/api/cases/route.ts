import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    // 1. Check for database connection
    if (!supabaseAdmin) {
        console.error('❌ Database connection is not configured.');
        return NextResponse.json({ error: 'The server is not configured correctly. Please contact support.' }, { status: 500 });
    }

    try {
        console.log('📦 Fetching all active cases from DB...');

        // 2. Fetch all cases that are marked as active with symbols
        const { data: cases, error } = await supabaseAdmin
            .from('cases')
            .select(`
              *,
              case_symbols (
                weight,
                symbols (* )
              )
            `)
            .eq('is_active', true)
            .order('price', { ascending: true });

        // 3. Handle database errors
        if (error) {
            console.error('❌ Error fetching cases from DB:', error);
            return NextResponse.json({ error: 'Failed to fetch cases. Please try again later.' }, { status: 500 });
        }

        // 4. Transform cases and include mapped symbols for the reel filler pool
        const mapped = (cases || []).map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            price: c.price,
            image_url: c.image_url,
            is_active: c.is_active,
            created_at: c.created_at,
            updated_at: c.updated_at,
            symbols: (c.case_symbols || []).map((cs: any) => ({
              symbolId: cs.symbols?.id,
              weight: cs.weight,
              symbol: {
                key: cs.symbols?.id,
                name: cs.symbols?.name,
                imageUrl: cs.symbols?.image_url || null,
                rarity: cs.symbols?.rarity || 'common'
              }
            }))
        }));

        console.log(`✅ Found ${mapped.length} active cases.`);

        // 5. Return the successfully fetched cases
        return NextResponse.json({
            success: true,
            cases: mapped,
        });

    } catch (error: any) {
        console.error('❌ UNHANDLED ERROR in cases API:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}
