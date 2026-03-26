import { AlertCircle, Inbox } from 'lucide-react';

export function AdminLoadingState({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{message || 'Cargando...'}</p>
      </div>
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
      <Inbox className="w-14 h-14 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
