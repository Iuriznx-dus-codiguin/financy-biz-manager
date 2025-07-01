
import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface TooltipInfoProps {
  content: string;
  className?: string;
}

export const TooltipInfo: React.FC<TooltipInfoProps> = ({ content, className = "" }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className={`h-4 w-4 text-muted-foreground cursor-help ${className}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
};
