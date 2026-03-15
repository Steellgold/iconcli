/**
 * Convert a string to PascalCase
 */
export const toPascalCase = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

/**
 * Convert a string to camelCase
 */
export const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/**
 * Convert a string to kebab-case
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Generate icon component name with suffix
 */
export const generateIconName = (
  input: string,
  suffix: string = 'Icon',
  caseFormat: 'PascalCase' | 'camelCase' | 'kebab-case' = 'PascalCase'
): string => {
  let baseName: string;
  
  switch (caseFormat) {
    case 'PascalCase':
      baseName = toPascalCase(input);
      break;
    case 'camelCase':
      baseName = toCamelCase(input);
      break;
    case 'kebab-case':
      baseName = toKebabCase(input);
      suffix = suffix.toLowerCase();
      break;
  }
  
  // Add suffix if not already present
  if (!baseName.endsWith(suffix)) {
    baseName = caseFormat === 'kebab-case' 
      ? `${baseName}-${suffix}`
      : `${baseName}${suffix}`;
  }
  
  return baseName;
};

/**
 * Extract icon name from filename
 */
export const extractIconNameFromFilename = (filename: string): string => {
  return filename
    .replace(/\.svg$/i, '')
    .replace(/[-_]/g, ' ');
};
