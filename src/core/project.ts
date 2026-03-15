import { existsSync } from 'fs';
import path from 'path';

/**
 * Find the project root by looking for package.json
 * @param startDir - Directory to start searching from (defaults to current working directory)
 * @returns Path to project root or null if not found
 */
export const findProjectRoot = (startDir: string = process.cwd()): string | null => {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  return null;
};

/**
 * Check if we're in a valid Node.js project
 */
export const isNodeProject = (dir: string = process.cwd()): boolean => {
  return existsSync(path.join(dir, 'package.json'));
};
