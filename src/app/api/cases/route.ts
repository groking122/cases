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

        // 2. Fetch all cases that are marked as "active"
        const { data: cases, error } = await supabaseAdmin
            .from('cases')
            .select('*')
            .eq('active', true) // Only fetch cases that are ready for production
            .order('price', { ascending: true }); // Order by price

        // 3. Handle database errors
        if (error) {
            console.error('❌ Error fetching cases from DB:', error);
            return NextResponse.json({ error: 'Failed to fetch cases. Please try again later.' }, { status: 500 });
        }

        // 4. If no active cases are found, return an empty array
        if (!cases) {
            console.log('⚠️ No active cases found in the database.');
            return NextResponse.json({ success: true, cases: [] });
        }

        // 5. Fetch the count of items (skins) for each case
        const casesWithCounts = await Promise.all(
            cases.map(async (caseItem) => {
                const { count, error: countError } = await supabaseAdmin!
                    .from('case_symbols')
                    .select('symbol_id', { count: 'exact', head: true })
                    .eq('case_id', caseItem.id);

                return {
                    ...caseItem,
                    skinCount: countError ? 0 : count ?? 0,
                };
            })
        );
        
        console.log(`✅ Found ${casesWithCounts.length} active cases.`);

        // 6. Return the successfully fetched cases
        return NextResponse.json({
            success: true,
            cases: casesWithCounts,
        });

    } catch (error: any) {
        console.error('❌ UNHANDLED ERROR in cases API:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}
