import React from 'react';

interface TypographyProps extends React.HTMLAttributes<HTMLSpanElement | HTMLParagraphElement | HTMLHeadingElement | HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'display' | 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';
  className?: string;
}

export function Typography({ 
  children, 
  variant = 'body', 
  className, 
  ...props 
}: TypographyProps) {
  // 定义不同变体的默认样式
  const variantClasses = {
    display: 'text-4xl md:text-5xl font-bold',
    heading: 'text-3xl font-bold',
    title: 'text-2xl font-bold',
    subtitle: 'text-xl font-semibold',
    body: 'text-base',
    caption: 'text-sm text-muted-foreground',
    label: 'text-sm font-medium',
  };

  // 根据变体选择合适的HTML标签
  const Tag = (
    variant === 'display' || 
    variant === 'heading' || 
    variant === 'title' || 
    variant === 'subtitle'
  ) ? 'h2' : 'span';

  return (
    <Tag className={`${variantClasses[variant]} ${className || ''}`} {...props}>
      {children}
    </Tag>
  );
}