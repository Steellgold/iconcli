#!/usr/bin/env node

import('../dist/index.js').catch((err) => {
  console.error('Failed to load mkicon:', err);
  process.exit(1);
});
