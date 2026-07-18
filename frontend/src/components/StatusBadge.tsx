import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical' | 'info' | 'open' | 'acknowledged' | 'resolved';
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'healthy':
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
      case 'acknowledged':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'critical':
      case 'open':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'healthy':
      case 'resolved':
        return 'bg-emerald-500';
      case 'warning':
      case 'acknowledged':
        return 'bg-amber-500';
      case 'critical':
      case 'open':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${getStatusStyles()} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
