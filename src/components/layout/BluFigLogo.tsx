import React from 'react';
import { cn } from '@/lib/utils';
import logoDark from '../../assets/blufig_logo_dark.svg';
import logoWhite from '../../assets/blufig_logo_white.svg';

interface BluFigLogoProps {
  className?: string;
  variant?: 'default' | 'light' | 'white';
}

export function BluFigLogo({ className, variant = 'default' }: BluFigLogoProps) {
  // Always use the high-quality dark-theme logo (logoWhite) in both light and dark themes
  return (
    <img 
      src={logoWhite} 
      className={cn("w-auto h-8 select-none inline-block", className)} 
      alt="BluFig Logo" 
      id="logo-static"
    />
  );
}


