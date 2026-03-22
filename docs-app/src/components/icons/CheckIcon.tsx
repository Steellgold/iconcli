/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface CheckIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const CheckIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: CheckIconProps) => {
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
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
};
