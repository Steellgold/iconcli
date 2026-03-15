import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Create a directory recursively if it doesn't exist
 */
export const ensureDir = async (dirPath: string): Promise<void> => {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Resolve a path relative to the project root
 */
export const resolveFromRoot = (projectRoot: string, ...segments: string[]): string => {
  return path.resolve(projectRoot, ...segments);
};

/**
 * Check if a directory exists
 */
export const dirExists = (dirPath: string): boolean => {
  try {
    return existsSync(dirPath);
  } catch {
    return false;
  }
};

/**
 * Get all files in a directory with a specific extension
 */
export const getFilesWithExtension = async (
  dirPath: string,
  extension: string
): Promise<string[]> => {
  const files = await fs.readdir(dirPath);
  return files.filter((file) => file.endsWith(extension));
};
