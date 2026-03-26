import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type FeedbackTone = 'error' | 'success' | 'info';

interface FeedbackBannerProps {
  tone: FeedbackTone;
  title: string;
  message: string;
}

const toneStyles: Record<FeedbackTone, string> = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const toneIcons: Record<FeedbackTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
};

export function FeedbackBanner({ tone, title, message }: FeedbackBannerProps) {
  const Icon = toneIcons[tone];

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${toneStyles[tone]}`} role="status" aria-live="polite">
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}
