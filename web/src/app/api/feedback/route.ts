import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, iteration, feedback, rating } = await request.json();

    if (!sessionId || !iteration) {
      return NextResponse.json({ error: 'Missing sessionId or iteration' }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), '..', 'output', `web_${sessionId}`);
    const evalJsonPath = path.join(outputDir, 'iterations', `iteration_${String(iteration).padStart(2, '0')}_eval.json`);

    // Check if eval file exists
    if (!fs.existsSync(evalJsonPath)) {
      return NextResponse.json({ error: 'Evaluation file not found' }, { status: 404 });
    }

    // Read existing eval data
    const evalData = JSON.parse(fs.readFileSync(evalJsonPath, 'utf-8'));

    // Add user feedback
    evalData.userFeedback = {
      comment: feedback || '',
      rating: typeof rating === 'number' ? rating : null,
      timestamp: new Date().toISOString()
    };

    // Save back
    fs.writeFileSync(evalJsonPath, JSON.stringify(evalData, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
