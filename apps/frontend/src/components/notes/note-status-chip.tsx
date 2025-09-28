import { cn } from '@/lib/utils';
import { Loader2, Upload, Mic, Brain, CheckCircle, AlertCircle } from 'lucide-react';

type NoteStatus = 'draft' | 'uploaded' | 'transcribing' | 'ready' | 'error';

interface NoteStatusChipProps {
  status: NoteStatus;
  className?: string;
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    icon: Upload,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  uploaded: {
    label: 'Subido',
    icon: Upload,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  transcribing: {
    label: 'Transcribiendo',
    icon: Loader2,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  ready: {
    label: 'Listo',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

export function NoteStatusChip({ status, className }: NoteStatusChipProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon
        className={cn(
          'h-3 w-3',
          status === 'transcribing' && 'animate-spin'
        )}
      />
      {config.label}
    </div>
  );
}