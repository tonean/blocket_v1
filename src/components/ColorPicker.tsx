/**
 * ColorPicker Component - Allows users to select background colors for their room design
 * Positioned below the room image as specified in requirements
 */

import { Devvit } from '@devvit/public-api';
import { isValidHexColor } from '../types/models.js';

export interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

/**
 * ColorPicker component that provides color selection interface
 */
export const ColorPicker = (props: ColorPickerProps): JSX.Element => {
  const { currentColor, onColorChange } = props;

  // Predefined color palette for quick selection
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

  return (
    <vstack
      width="100%"
      padding="medium"
      gap="medium"
      backgroundColor="#F9FAFB"
      cornerRadius="medium"
    >
      {/* Header */}
      <hstack gap="small" alignment="middle">
        <text size="medium" weight="bold" color="#111827">
          Background Color
        </text>
        <text size="small" color="#6B7280">
          Choose a color for your room
        </text>
      </hstack>

      {/* Color Preview */}
      <hstack gap="medium" alignment="middle">
        <vstack
          width="60px"
          height="60px"
          backgroundColor={currentColor}
          cornerRadius="small"
          borderColor="#D1D5DB"
        >
          <text size="xsmall" color="#FFFFFF">
            {/* Empty - just for visual preview */}
          </text>
        </vstack>
        
        <vstack gap="small" grow>
          <text size="small" color="#374151" weight="bold">
            Current Color
          </text>
          <text size="small" color="#6B7280">
            {currentColor}
          </text>
        </vstack>
      </hstack>

      {/* Color Palette - Quick Selection */}
      <vstack gap="small">
        <text size="small" color="#374151" weight="bold">
          Quick Select
        </text>
        <hstack gap="small" wrap>
          {colorPalette.map((color) => (
            <vstack
              key={color}
              width="40px"
              height="40px"
              backgroundColor={color}
              cornerRadius="small"
              borderColor={currentColor === color ? '#3B82F6' : '#D1D5DB'}
              onPress={() => onColorChange(color)}
            >
              {currentColor === color && (
                <text size="xsmall" color="#3B82F6">
                  ✓
                </text>
              )}
            </vstack>
          ))}
        </hstack>
      </vstack>

      {/* Custom Color Input */}
      <vstack gap="small">
        <text size="small" color="#374151" weight="bold">
          Custom Color (Hex)
        </text>
        <hstack gap="small" alignment="middle">
          <text size="small" color="#6B7280">
            #
          </text>
          <textInput
            placeholder="FFFFFF"
            value={currentColor.replace('#', '')}
            onChangeText={(value) => {
              // Add # prefix if not present
              const colorValue = value.startsWith('#') ? value : `#${value}`;
              
              // Validate hex color format
              if (isValidHexColor(colorValue)) {
                onColorChange(colorValue);
              }
            }}
          />
        </hstack>
        <text size="xsmall" color="#9CA3AF">
          Enter 6-digit hex code (e.g., FF5733)
        </text>
      </vstack>
    </vstack>
  );
};
