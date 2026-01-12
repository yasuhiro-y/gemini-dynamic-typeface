'use client';

import { useState } from 'react';

interface FeedbackSectionProps {
  sessionId: string;
  iteration: number;
  initialFeedback?: string;
  initialRating?: number | null;
  apiEndpoint?: string;
}

export function FeedbackSection({
  sessionId,
  iteration,
  initialFeedback = '',
  initialRating = null,
  apiEndpoint = '/api/feedback',
}: FeedbackSectionProps) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveFeedback = async () => {
    if (!sessionId) return;

    setIsSaving(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          iteration,
          feedback,
          rating,
        }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error('Failed to save feedback:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Your Feedback</div>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs text-white/40 mr-2">Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(rating === star ? null : star)}
            className={`w-6 h-6 text-sm transition-colors ${
              rating && star <= rating ? 'text-yellow-400' : 'text-white/20 hover:text-white/40'
            }`}
          >
            ★
          </button>
        ))}
        {rating && (
          <span className="text-xs text-white/40 ml-2">{rating}/5</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Write your feedback..."
        rows={2}
        className="w-full py-2 px-3 text-xs bg-transparent border border-white/20 text-white placeholder:text-white/30 rounded-lg focus:outline-none focus:border-white/40 resize-none"
      />

      {/* Save Button */}
      <button
        onClick={handleSaveFeedback}
        disabled={isSaving || (!feedback && rating === null)}
        className={`mt-2 w-full py-1.5 text-xs rounded-lg transition-colors ${
          saved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'text-white/60 border border-white/20 hover:bg-white/5 hover:text-white/80 disabled:opacity-30'
        }`}
      >
        {isSaving ? 'Saving...' : saved ? '✓ Saved' : 'Save Feedback'}
      </button>
    </div>
  );
}
