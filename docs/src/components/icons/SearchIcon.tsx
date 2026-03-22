/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface SearchIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const SearchIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: SearchIconProps) => {
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
      <path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>
    </svg>
  );
};
