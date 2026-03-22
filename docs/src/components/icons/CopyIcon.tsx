/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface CopyIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const CopyIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: CopyIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      { ...(size && { width: size, height: size }) }
      viewBox="0 0 24 24"
      fill="none"
      { ...(color && { stroke: color }) }
      { ...(className && { className }) }
      { ...props }
    >
      <rect x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
};
