import React from 'react';
import { UserRole } from '../types/index.js';

interface RoleBadgeProps {
  role: UserRole | string;
  size?: 'sm' | 'md' | 'lg';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const getBadgeConfig = () => {
    switch (role) {
      case 'HOUSEKEEPING_SUPERVISOR':
        return {
          label: 'Housekeeping Supervisor',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-emerald-500/10',
          dot: 'bg-emerald-500',
        };
      case 'MANAGER':
        return {
          label: 'Responsible Manager',
          bg: 'bg-purple-50 text-purple-800 border-purple-200 ring-purple-500/10',
          dot: 'bg-purple-500',
        };
      case 'STORES_STAFF':
        return {
          label: 'Stores Staff',
          bg: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10',
          dot: 'bg-amber-500',
        };
      case 'PROCUREMENT_STAFF':
        return {
          label: 'Procurement Staff',
          bg: 'bg-sky-50 text-sky-800 border-sky-200 ring-sky-500/10',
          dot: 'bg-sky-500',
        };
      case 'ADMIN':
        return {
          label: 'System Admin',
          bg: 'bg-rose-50 text-rose-800 border-rose-200 ring-rose-500/10',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: role,
          bg: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-3.5 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ring-1 ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
