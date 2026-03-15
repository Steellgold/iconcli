import { describe, it, expect } from 'vitest';
import { generateSvelteComponent, getSvelteFileExtension } from './svelte.js';
import type { Config } from '@/config/schema.js';

const defaultProps: Config['props'] = {
  size: true,
  color: true,
  className: true,
  style: false,
};

describe('generateSvelteComponent', () => {
  it('includes viewBox in output', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: '0 0 24 24',
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it('injects inner SVG content', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg><path d="M1 1"/></svg>',
      viewBox: '0 0 24 24',
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain('<path d="M1 1"/>');
  });

  it('includes script section with props when size or color enabled', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg></svg>',
      viewBox: '0 0 24 24',
      typescript: true,
      props: { size: true, color: true, className: true, style: false },
    });
    expect(out).toContain('<script');
    expect(out).toContain('export let size');
    expect(out).toContain('export let color');
  });

  it('includes lang="ts" when typescript is true', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg></svg>',
      viewBox: '0 0 24 24',
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain('<script lang="ts">');
  });

  it('omits script section when no props', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg></svg>',
      viewBox: '0 0 24 24',
      typescript: false,
      props: { size: false, color: false, className: false, style: false },
    });
    expect(out).not.toContain('<script');
    expect(out).toContain('<svg');
  });

  it('includes $$restProps in svg', () => {
    const out = generateSvelteComponent({
      componentName: 'ArrowIcon',
      svgContent: '<svg></svg>',
      viewBox: '0 0 24 24',
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain('{...$$restProps}');
  });
});

describe('getSvelteFileExtension', () => {
  it('returns .svelte', () => {
    expect(getSvelteFileExtension()).toBe('.svelte');
  });
});
