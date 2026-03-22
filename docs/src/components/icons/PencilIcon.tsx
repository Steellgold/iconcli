/**
 * Generated with mkicon v0.6.0
 * https://github.com/Steellgold/mkicon
 */

import type { SVGProps } from 'react';

export interface PencilIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const PencilIcon = ({   size = 24,
  color = 'currentColor',
className,
...props }: PencilIconProps) => {
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
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>
    </svg>
  );
};
