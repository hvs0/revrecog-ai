import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = 'text-primary-800',
  loading = false,
}) => {
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return 'text-gray-400';
    if (trend > 0) return 'text-emerald-500';
    if (trend < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-8 w-32"></div>
          </div>
          <div className="skeleton h-10 w-10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-primary-50 ${iconColor} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
