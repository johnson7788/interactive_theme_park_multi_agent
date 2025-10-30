import { ReactNode } from 'react';
import { Box } from '@/components/ui/box';
import { Typography } from '@/components/ui/typography';

interface LogoProps {
  className?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, children, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  const fontSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className || ''}`}>
      <Box className="w-8 h-8 bg-primary rounded-md flex items-center justify-center mr-2">
        <Typography variant="display" className="text-white font-bold">A</Typography>
      </Box>
      <Typography variant="display" className={`font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent ${fontSizeClasses[size]}`}>
        {children || '阿派朗创造力乐园'}
      </Typography>
    </div>
  );
}