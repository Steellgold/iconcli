import enquirer from 'enquirer';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const { prompt } = enquirer;

export interface WriteFileOptions {
  projectRoot: string;
  baseDir: string;
  iconsFolder: string;
  filename: string;
  content: string;
  force?: boolean;
}

/**
 * Write component file to disk
 */
export const writeComponentFile = async (options: WriteFileOptions): Promise<string> => {
  const { projectRoot, baseDir, iconsFolder, filename, content, force = false } = options;
  
  const fullDir = path.join(projectRoot, baseDir, iconsFolder);
  const fullPath = path.join(fullDir, filename);
  
  // Check if file exists
  if (existsSync(fullPath) && !force) {
    const response = await prompt<{ action: string }>({
      type: 'select',
      name: 'action',
      message: `File ${filename} already exists. What do you want to do?`,
      choices: [
        { name: 'overwrite', message: 'Overwrite the existing file' },
        { name: 'rename', message: 'Create with a different name' },
        { name: 'skip', message: 'Skip this file' },
      ],
    });
    
    if (response.action === 'skip') {
      throw new Error('File creation cancelled by user');
    }
    
    if (response.action === 'rename') {
      const newName = await prompt<{ filename: string }>({
        type: 'input',
        name: 'filename',
        message: 'Enter new filename:',
        initial: filename,
      });
      
      const newPath = path.join(fullDir, newName.filename);
      await fs.writeFile(newPath, content, 'utf-8');
      return newPath;
    }
  }
  
  // Write file
  await fs.writeFile(fullPath, content, 'utf-8');
  return fullPath;
};
