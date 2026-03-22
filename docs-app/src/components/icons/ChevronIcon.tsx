/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export type ChevronDirection = 'up' | 'down' | 'left' | 'right';

export interface ChevronIconProps extends SVGProps<SVGSVGElement> {
  direction: ChevronDirection;
  size?: number | string;
  color?: string;
}

const paths: Record<ChevronDirection, string> = {
  up: 'm18 15-6-6-6 6',
  down: 'm6 9 6 6 6-6',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
};

export const ChevronIcon = ({
  direction,
  size = 24,
  color = 'currentColor',
  className,
  ...props
}: ChevronIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      {...(size && { width: size, height: size })}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(color && { stroke: color })}
      {...(className && { className })}
      {...props}
    >
      <path d={paths[direction]} />
    </svg>
  );
};
