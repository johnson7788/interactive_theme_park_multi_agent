import React, { forwardRef } from 'react';
import { Link } from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

interface NavLinkProps extends ButtonProps {
  href: string;
  active?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, active: activeProp, className, variant = 'ghost', ...props }, ref) => {
    const pathname = usePathname();
    const isActive = activeProp !== undefined ? activeProp : pathname === href;

    return (
      <Button
        ref={ref}
        asChild
        variant={isActive ? 'secondary' : variant}
        className={[
          'justify-start gap-2 font-normal',
          isActive ? 'bg-accent text-accent-foreground' : '',
          className,
        ].join(' ')}
        {...props}
      >
        <Link href={href} className="w-full justify-start">
          {props.children}
        </Link>
      </Button>
    );
  }
);

NavLink.displayName = 'NavLink';