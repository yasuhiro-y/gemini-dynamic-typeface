import { NextRequest, NextResponse } from 'next/server';

// Note: In a serverless environment, we can't persist feedback to files.
// For production, this should be connected to a database (e.g., Supabase).
// For now, we just acknowledge the feedback without persisting it.

export async function POST(request: NextRequest) {
  try {
    const { sessionId, iteration, feedback, rating } = await request.json();

    if (!sessionId || !iteration) {
      return NextResponse.json({ error: 'Missing sessionId or iteration' }, { status: 400 });
    }

    // Log the feedback (for debugging)
    console.log('[Feedback] Received:', {
      sessionId,
      iteration,
      feedback: feedback?.substring(0, 100),
      rating,
      timestamp: new Date().toISOString()
    });

    // In a production environment, you would save this to a database here.
    // For example, with Supabase:
    // await supabase.from('feedback').insert({
    //   session_id: sessionId,
    //   iteration,
    //   feedback,
    //   rating,
    //   created_at: new Date().toISOString()
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
