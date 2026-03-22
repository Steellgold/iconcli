/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface XIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const XIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: XIconProps) => {
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
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
};
