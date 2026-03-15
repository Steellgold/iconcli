import { optimize } from 'svgo';
import { extractViewBox } from '../utils/validation.js';

export interface ProcessedSVG {
  content: string;
  viewBox: string;
  originalSize: number;
  optimizedSize: number;
}

/**
 * Optimize SVG content using SVGO
 */
export const optimizeSVG = async (
  svgContent: string,
  shouldOptimize: boolean = true
): Promise<ProcessedSVG> => {
  const originalSize = Buffer.byteLength(svgContent, 'utf-8');
  
  if (!shouldOptimize) {
    const viewBox = extractViewBox(svgContent) || '0 0 24 24';
    return {
      content: svgContent,
      viewBox,
      originalSize,
      optimizedSize: originalSize,
    };
  }
  
  const result = optimize(svgContent, {
    plugins: [
      'removeDoctype',
      'removeComments',
      'cleanupAttrs',
      'removeEmptyAttrs',
      'removeUselessDefs',
      'cleanupNumericValues',
      'convertColors',
      'removeEmptyContainers',
    ],
  });
  
  const optimizedContent = result.data;
  const optimizedSize = Buffer.byteLength(optimizedContent, 'utf-8');
  
  // Extract viewBox from optimized content
  const viewBox = extractViewBox(optimizedContent) || '0 0 24 24';
  
  return {
    content: optimizedContent,
    viewBox,
    originalSize,
    optimizedSize,
  };
};

/**
 * Clean SVG attributes that shouldn't be in component
 */
export const cleanSVGAttributes = (svgContent: string): string => {
  let cleaned = svgContent;
  
  // Remove width and height attributes (we'll control these via props)
  cleaned = cleaned.replace(/\s*width=["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*height=["'][^"']*["']/gi, '');
  
  return cleaned;
};
