import { LucideIcon } from 'lucide-react';
import { Card } from '../Card';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  helper?: string;
}

const toneStyles: Record<NonNullable<AdminStatCardProps['tone']>, string> = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  yellow: 'text-yellow-700 bg-yellow-100',
  red: 'text-red-600 bg-red-100',
  gray: 'text-gray-600 bg-gray-100',
};

export function AdminStatCard({ label, value, icon: Icon, tone = 'blue', helper }: AdminStatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneStyles[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </Card>
  );
}
