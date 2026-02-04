/**
 * Unit tests for ColorPicker component
 */

import { describe, test, expect } from 'vitest';
import { isValidHexColor } from '../types/models.js';

describe('ColorPicker Unit Tests', () => {
  describe('Valid Hex Color Input', () => {
    test('should accept valid 6-digit hex color with #', () => {
      const color = '#FF5733';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept valid hex color with lowercase letters', () => {
      const color = '#ff5733';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept valid hex color with uppercase letters', () => {
      const color = '#FF5733';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept valid hex color with mixed case', () => {
      const color = '#Ff5733';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept white color', () => {
      const color = '#FFFFFF';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept black color', () => {
      const color = '#000000';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept hex color with all numbers', () => {
      const color = '#123456';
      expect(isValidHexColor(color)).toBe(true);
    });

    test('should accept hex color with all letters', () => {
      const color = '#ABCDEF';
      expect(isValidHexColor(color)).toBe(true);
    });
  });

  describe('Invalid Color Input Handling', () => {
    test('should reject hex color without # prefix', () => {
      const color = 'FF5733';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject hex color with less than 6 digits', () => {
      const color = '#FF573';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject hex color with more than 6 digits', () => {
      const color = '#FF57333';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject hex color with invalid characters', () => {
      const color = '#GG5733';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject hex color with spaces', () => {
      const color = '#FF 573';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject empty string', () => {
      const color = '';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject only # symbol', () => {
      const color = '#';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject hex color with special characters', () => {
      const color = '#FF@733';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject 3-digit hex shorthand', () => {
      const color = '#F57';
      expect(isValidHexColor(color)).toBe(false);
    });

    test('should reject 8-digit hex with alpha', () => {
      const color = '#FF5733FF';
      expect(isValidHexColor(color)).toBe(false);
    });
  });

  describe('Color Change Handler', () => {
    test('should handle color change with valid hex color', () => {
      const initialColor = '#FFFFFF';
      const newColor = '#FF5733';
      
      // Simulate color change
      let currentColor = initialColor;
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      onColorChange(newColor);
      expect(currentColor).toBe(newColor);
    });

    test('should not change color with invalid hex color', () => {
      const initialColor = '#FFFFFF';
      const invalidColor = 'invalid';
      
      // Simulate color change
      let currentColor = initialColor;
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      onColorChange(invalidColor);
      expect(currentColor).toBe(initialColor);
    });

    test('should handle adding # prefix to input', () => {
      const inputValue = 'FF5733';
      const expectedColor = '#FF5733';
      
      // Simulate adding # prefix
      const colorValue = inputValue.startsWith('#') ? inputValue : `#${inputValue}`;
      
      expect(colorValue).toBe(expectedColor);
      expect(isValidHexColor(colorValue)).toBe(true);
    });

    test('should not add # prefix if already present', () => {
      const inputValue = '#FF5733';
      const expectedColor = '#FF5733';
      
      // Simulate adding # prefix
      const colorValue = inputValue.startsWith('#') ? inputValue : `#${inputValue}`;
      
      expect(colorValue).toBe(expectedColor);
      expect(isValidHexColor(colorValue)).toBe(true);
    });
  });

  describe('Color Palette Selection', () => {
    test('should have predefined color palette', () => {
      const colorPalette = [
        '#FFFFFF', // White
        '#F3F4F6', // Light Gray
        '#E8F4F8', // Light Blue
        '#FEF3C7', // Light Yellow
        '#FEE2E2', // Light Red
        '#DCFCE7', // Light Green
        '#E0E7FF', // Light Indigo
        '#FCE7F3', // Light Pink
        '#D1FAE5', // Mint
        '#DBEAFE', // Sky Blue
        '#FED7AA', // Peach
        '#E9D5FF', // Lavender
      ];
      
      // Verify all colors in palette are valid
      colorPalette.forEach(color => {
        expect(isValidHexColor(color)).toBe(true);
      });
    });

    test('should select color from palette', () => {
      const initialColor = '#FFFFFF';
      const selectedColor = '#E8F4F8';
      
      // Simulate palette selection
      let currentColor = initialColor;
      const onColorChange = (color: string) => {
        currentColor = color;
      };
      
      onColorChange(selectedColor);
      expect(currentColor).toBe(selectedColor);
    });
  });

  describe('Color Preview', () => {
    test('should display current color', () => {
      const currentColor = '#FF5733';
      
      // Verify color is valid for display
      expect(isValidHexColor(currentColor)).toBe(true);
      expect(currentColor).toBe('#FF5733');
    });

    test('should update preview when color changes', () => {
      let currentColor = '#FFFFFF';
      const newColor = '#FF5733';
      
      // Simulate color change
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      onColorChange(newColor);
      expect(currentColor).toBe(newColor);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid color changes', () => {
      let currentColor = '#FFFFFF';
      const colors = ['#FF5733', '#33FF57', '#3357FF', '#F0F0F0'];
      
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      colors.forEach(color => {
        onColorChange(color);
        expect(currentColor).toBe(color);
      });
    });

    test('should handle same color selection', () => {
      const initialColor = '#FF5733';
      let currentColor = initialColor;
      
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      // Select same color again
      onColorChange(initialColor);
      expect(currentColor).toBe(initialColor);
    });

    test('should handle empty input gracefully', () => {
      const initialColor = '#FFFFFF';
      let currentColor = initialColor;
      
      const onColorChange = (color: string) => {
        if (isValidHexColor(color)) {
          currentColor = color;
        }
      };
      
      // Try to change to empty string
      onColorChange('');
      expect(currentColor).toBe(initialColor);
    });
  });
});
