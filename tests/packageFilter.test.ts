import { describe, it, expect } from 'vitest';

function filterPackages(packageDetails: Record<string, any>) {
  return Object.entries(packageDetails || {})
    .filter(([id, pkg]: [string, any]) => {
      const isPublic = pkg.publicEnabled ?? pkg.active ?? pkg.enabled ?? true;
      return isPublic && pkg.active !== false;
    })
    .sort((a: any, b: any) => (a[1].displayOrder || 0) - (b[1].displayOrder || 0));
}

describe('Package Filtering & Fallback Logic', () => {
  it('loads packages successfully when fully formed', () => {
    const packages = {
      'town_block': { name: 'Town Block', active: true, publicEnabled: true, displayOrder: 1 },
      'standard_yard': { name: 'Standard Yard', active: true, publicEnabled: true, displayOrder: 2 },
    };
    const result = filterPackages(packages);
    expect(result.length).toBe(2);
    expect(result[0][0]).toBe('town_block');
  });

  it('safely falls back to active when publicEnabled is missing', () => {
    const packages = {
      'town_block': { name: 'Town Block', active: true, displayOrder: 1 }, // no publicEnabled
    };
    const result = filterPackages(packages);
    expect(result.length).toBe(1);
    expect(result[0][0]).toBe('town_block');
  });

  it('hides packages when active is explicitly false', () => {
    const packages = {
      'town_block': { name: 'Town Block', active: false, publicEnabled: true, displayOrder: 1 }, 
    };
    const result = filterPackages(packages);
    expect(result.length).toBe(0);
  });

  it('hides packages when publicEnabled is explicitly false', () => {
    const packages = {
      'town_block': { name: 'Town Block', active: true, publicEnabled: false, displayOrder: 1 }, 
    };
    const result = filterPackages(packages);
    expect(result.length).toBe(0);
  });

  it('handles empty or null response gracefully', () => {
    expect(filterPackages({}).length).toBe(0);
    expect(filterPackages(null as any).length).toBe(0);
    expect(filterPackages(undefined as any).length).toBe(0);
  });

  it('includes Custom Quote', () => {
    const packages = {
      'custom_quote': { name: 'Custom Quote', active: true, displayOrder: 6 }, 
    };
    const result = filterPackages(packages);
    expect(result.length).toBe(1);
    expect(result[0][0]).toBe('custom_quote');
  });
});
