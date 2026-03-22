/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface MenuIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const MenuIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: MenuIconProps) => {
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
      <path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>
    </svg>
  );
};
