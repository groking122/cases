import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ 
                status: 'error',
                error: 'Database connection not configured',
                details: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing'
            }, { status: 500 });
        }

        console.log('🔍 Testing database connection...');

        // Test basic connection
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('*')
            .limit(1);

        if (usersError) {
            return NextResponse.json({
                status: 'error',
                error: 'Failed to query users table',
                details: usersError.message,
                code: usersError.code
            }, { status: 500 });
        }

        // Test cases table
        const { data: cases, error: casesError } = await supabaseAdmin
            .from('cases')
            .select('*')
            .limit(1);

        if (casesError) {
            return NextResponse.json({
                status: 'error',
                error: 'Failed to query cases table',
                details: casesError.message,
                code: casesError.code
            }, { status: 500 });
        }

        // Test symbols table
        const { data: symbols, error: symbolsError } = await supabaseAdmin
            .from('symbols')
            .select('*')
            .limit(1);

        if (symbolsError) {
            return NextResponse.json({
                status: 'error',
                error: 'Failed to query symbols table',
                details: symbolsError.message,
                code: symbolsError.code
            }, { status: 500 });
        }

        // Test case_symbols table
        const { data: caseSymbols, error: caseSymbolsError } = await supabaseAdmin
            .from('case_symbols')
            .select('*')
            .limit(1);

        return NextResponse.json({
            status: 'connected',
            timestamp: new Date().toISOString(),
            tables: {
                users: {
                    accessible: !usersError,
                    count: users?.length || 0,
                    error: usersError?.message || null
                },
                cases: {
                    accessible: !casesError,
                    count: cases?.length || 0,
                    error: casesError?.message || null
                },
                symbols: {
                    accessible: !symbolsError,
                    count: symbols?.length || 0,
                    error: symbolsError?.message || null
                },
                case_symbols: {
                    accessible: !caseSymbolsError,
                    count: caseSymbols?.length || 0,
                    error: caseSymbolsError?.message || null
                }
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
                serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
            }
        });

    } catch (error: any) {
        console.error('❌ Database test failed:', error);
        return NextResponse.json({
            status: 'error',
            error: 'Database test failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}