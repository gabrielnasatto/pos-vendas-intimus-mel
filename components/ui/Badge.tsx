import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { StatusCliente } from '@/types';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusCliente;
}

const statusConfig = {
  pendente: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    emoji: '🟡',
  },
  enviado: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    emoji: '✅',
  },
  erro: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    emoji: '❌',
  },
  duplicado: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    emoji: '⚪',
  },
};

export default function Badge({ status, className, ...props }: BadgeProps) {
  const config = statusConfig[status] || statusConfig.pendente;
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm',
        config.bg,
        config.border,
        config.text,
        className
      )}
      {...props}
    >
      <span className="mr-1.5">{config.emoji}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}