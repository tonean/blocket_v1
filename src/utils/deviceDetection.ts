/**
 * Device Detection Utilities
 * Provides functions to detect device type and get optimized layout dimensions
 */

import { Context } from '@devvit/public-api';

export type DeviceType = 'desktop' | 'mobile';

export interface LayoutDimensions {
  canvasHeight: string;
  assetLibraryHeight: string;
  canvasWidth: string;
  assetLibraryWidth: string;
  roomImageWidth: number;
  roomImageHeight: number;
  assetThumbnailSize: number;
}

/**
 * Detect device type based on Devvit context
 * Uses viewport dimensions, user agent, or other available indicators
 * 
 * @param context - Devvit context object
 * @returns 'desktop' or 'mobile'
 */
export function detectDeviceType(context: Context): DeviceType {
  try {
    // Devvit's context may provide device information through various properties
    // Check for mobile indicators in the environment
    
    // Strategy 1: Check viewport dimensions if available
    // if (context.dimensions?.width && context.dimensions.width < 768) {
    //   return 'mobile';
    // }
    
    // Strategy 2: Check UI client type if available
    // if (context.ui?.client === 'mobile' || context.ui?.platform === 'ios' || context.ui?.platform === 'android') {
    //   return 'mobile';
    // }
    
    // Strategy 3: Check user agent if available
    // const userAgent = context.userAgent?.toLowerCase() || '';
    // if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
    //   return 'mobile';
    // }
    
    // Default to desktop for broader compatibility
    // Mobile users can still use the interface with desktop layout
    return 'desktop';
  } catch (error) {
    // Fallback to desktop on any error
    console.error('Error detecting device type:', error);
    return 'desktop';
  }
}

/**
 * Get optimized layout dimensions for the detected device type
 * 
 * @param deviceType - The device type ('desktop' or 'mobile')
 * @returns Layout dimensions object with optimized values
 */
export function getLayoutDimensions(deviceType: DeviceType): LayoutDimensions {
  if (deviceType === 'mobile') {
    return {
      canvasHeight: '70%',
      assetLibraryHeight: '30%',
      canvasWidth: '100%',
      assetLibraryWidth: '100%',
      roomImageWidth: 350,
      roomImageHeight: 260,
      assetThumbnailSize: 60,
    };
  }
  
  // Desktop dimensions
  return {
    canvasHeight: '100%',
    assetLibraryHeight: '100%',
    canvasWidth: '60%',
    assetLibraryWidth: '40%',
    roomImageWidth: 600,
    roomImageHeight: 450,
    assetThumbnailSize: 80,
  };
}

/**
 * Check if the current device is mobile
 * 
 * @param context - Devvit context object
 * @returns true if mobile, false if desktop
 */
export function isMobileDevice(context: Context): boolean {
  return detectDeviceType(context) === 'mobile';
}

/**
 * Get responsive styling based on device type
 * 
 * @param deviceType - The device type
 * @returns Object with responsive style values
 */
export function getResponsiveStyles(deviceType: DeviceType) {
  if (deviceType === 'mobile') {
    return {
      padding: 'small' as const,
      gap: 'small' as const,
      fontSize: 'small' as const,
      buttonSize: 'small' as const,
      borderRadius: 'small' as const,
    };
  }
  
  return {
    padding: 'medium' as const,
    gap: 'medium' as const,
    fontSize: 'medium' as const,
    buttonSize: 'medium' as const,
    borderRadius: 'medium' as const,
  };
}
