import React from 'react';

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Box({ children, className, ...props }: BoxProps) {
  return (
    <div className={className || ''} {...props}>
      {children}
    </div>
  );
}