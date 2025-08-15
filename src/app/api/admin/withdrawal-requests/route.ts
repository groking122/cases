import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch all withdrawal requests (admin only)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { data: requests, error } = await supabaseAdmin
      .from('admin_fraud_detection_dashboard')
      .select('*')
      .order('risk_score', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch withdrawal requests' }, { status: 500 })
    }

    return NextResponse.json({ requests })

  } catch (error) {
    console.error('Error fetching withdrawal requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update withdrawal request status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { requestId, status, notes } = await request.json()

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (notes) {
      updateData.admin_notes = notes
    }

    if (status === 'completed') {
      updateData.processed_at = new Date().toISOString()
      updateData.processed_by = 'admin' // TODO: Get actual admin user
    }

    const { data, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update withdrawal request' }, { status: 500 })
    }

    // If completed, also mark the case opening as withdrawn
    if (status === 'completed' && data) {
      await supabaseAdmin
        .from('case_openings')
        .update({
          is_withdrawn: true,
          withdrawal_type: 'cash',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.case_opening_id)
    }

    // Send email notification to user about status change
    await sendStatusUpdateNotification(data, status)

    return NextResponse.json({ 
      success: true, 
      message: `Withdrawal request ${status} successfully`,
      request: data 
    })

  } catch (error) {
    console.error('Error updating withdrawal request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Email notification function
async function sendStatusUpdateNotification(request: any, newStatus: string) {
  // TODO: Implement with your preferred email service
  console.log('📧 WITHDRAWAL STATUS UPDATE NOTIFICATION:')
  console.log('==========================================')
  console.log(`Request ID: ${request.id}`)
  console.log(`User: ${request.wallet_address}`)
  console.log(`New Status: ${newStatus}`)
  console.log(`Amount: ${request.amount} credits`)
  console.log(`Item: ${request.symbol_name}`)
  console.log('==========================================')
  
  // Send actual email here
  /*
  const statusMessages = {
    processing: 'Your withdrawal request is now being processed.',
    completed: 'Your withdrawal has been completed! Funds should arrive within 1-3 business days.',
    cancelled: 'Your withdrawal request has been cancelled. Please contact support if you have questions.'
  }

  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: request.user_email }], // You'd need to get user email
          subject: `💸 Withdrawal Request Update - ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`
        }],
        from: { email: process.env.FROM_EMAIL },
        content: [{
          type: 'text/html',
          value: `
            <h2>Withdrawal Request Update</h2>
            <p><strong>Request ID:</strong> ${request.id}</p>
            <p><strong>Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
            <p><strong>Amount:</strong> ${request.amount} credits</p>
            <p><strong>Item:</strong> ${request.symbol_name}</p>
            
            <p>${statusMessages[newStatus as keyof typeof statusMessages]}</p>
            
            <p>Thank you for using our platform!</p>
          `
        }]
      })
    })
  } catch (error) {
    console.error('Email sending failed:', error)
  }
  */
}
