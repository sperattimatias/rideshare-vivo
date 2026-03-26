import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface AdminPageShellProps {
  title: string;
  description?: string;
  onBack?: () => void;
  children: ReactNode;
  rightAction?: ReactNode;
  compact?: boolean;
}

export function AdminPageShell({
  title,
  description,
  onBack,
  children,
  rightAction,
  compact = false,
}: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {onBack && (
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver al panel
            </button>
          </div>
        </nav>
      )}

      <div className={`${compact ? 'max-w-4xl' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            {description && <p className="text-gray-600">{description}</p>}
          </div>
          {rightAction}
        </div>

        {children}
      </div>
    </div>
  );
}
