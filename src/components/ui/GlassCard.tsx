import { ReactNode } from 'react';

export function GlassCard({
  children,
  className = '',
  hover = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 ${hover ? 'glass-card-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
