/**
 * Convert a string to PascalCase
 * Preserves existing PascalCase/camelCase structure
 */
export const toPascalCase = (str: string): string => {
  // If already in PascalCase or camelCase, preserve it
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str) || /^[a-z][a-zA-Z0-9]*$/.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
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
 * Generate icon component name (for internal use)
 */
export const generateComponentName = (
  input: string,
  suffix: string = 'Icon',
  suffixEnabled: boolean = true
): string => {
  let baseName = toPascalCase(input);
  
  // Add suffix if enabled and not already present
  if (suffixEnabled && !baseName.endsWith(suffix)) {
    baseName = `${baseName}${suffix}`;
  }
  
  return baseName;
};

/**
 * Generate icon file name
 */
export const generateFileName = (
  componentName: string,
  fileCase: 'PascalCase' | 'camelCase' | 'kebab-case' = 'PascalCase'
): string => {
  switch (fileCase) {
    case 'PascalCase':
      return componentName;
    case 'camelCase':
      return toCamelCase(componentName);
    case 'kebab-case':
      return toKebabCase(componentName);
  }
};

/**
 * Generate icon component name with suffix (legacy - kept for compatibility)
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
