import React from 'react';
import { cn } from '@/lib/utils';
import logoDark from '../../assets/blufig_logo_dark.svg';
import logoWhite from '../../assets/blufig_logo_white.svg';

interface BluFigLogoProps {
  className?: string;
  variant?: 'default' | 'light' | 'white';
}

export function BluFigLogo({ className, variant = 'default' }: BluFigLogoProps) {
  if (variant === 'default') {
    return (
      <span className="inline-flex items-center">
        <img 
          src={logoDark} 
          className={cn("w-auto h-8 select-none inline-block dark:hidden", className)} 
          alt="BluFig Logo" 
          id="logo-light"
        />
        <img 
          src={logoWhite} 
          className={cn("w-auto h-8 select-none hidden dark:inline-block", className)} 
          alt="BluFig Logo" 
          id="logo-dark"
        />
      </span>
    );
  }

  const logoSrc = variant === 'white' ? logoWhite : logoDark;
  return (
    <img 
      src={logoSrc} 
      className={cn("w-auto h-8 select-none inline-block", className)} 
      alt="BluFig Logo" 
      id="logo-static"
    />
  );
}


