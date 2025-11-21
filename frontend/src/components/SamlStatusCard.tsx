import { format } from 'date-fns';

interface SamlStatusCardProps {
  title: string;
  data: any;
  className?: string;
}

export const SamlStatusCard: React.FC<SamlStatusCardProps> = ({ title, data, className = '' }) => {
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (value instanceof Date || typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return format(date, 'PPpp');
        }
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <div className={`card ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-gray-600">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <span className="text-sm text-gray-900 break-all">
              {renderValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
