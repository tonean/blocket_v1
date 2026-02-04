/**
 * ResponsiveLayout - Detects device type and renders appropriate layout
 * Provides desktop (grid-based, side-by-side) or mobile (stacked, touch-optimized) layouts
 */

import { Devvit, Context } from '@devvit/public-api';
import { Design } from '../types/models.js';
import { CanvasController } from './CanvasController.js';
import { MobileCanvasController } from './MobileCanvasController.js';
import { AssetLibrary } from './AssetLibrary.js';
import { Asset, AssetCategory } from '../types/models.js';
import { detectDeviceType, getLayoutDimensions, getResponsiveStyles } from '../utils/deviceDetection.js';

export interface ResponsiveLayoutProps {
  design: Design;
  mode: 'edit' | 'preview';
  context: Context;
  assets: Asset[];
  selectedCategory?: AssetCategory | null;
  searchQuery?: string;
  onDesignUpdate: (design: Design) => void;
  onAssetSelect: (asset: Asset) => void;
  onCategoryFilter: (category: AssetCategory | null) => void;
  onSearch: (query: string) => void;
  onSubmit?: () => void;
  isSubmitted?: boolean;
}

/**
 * ResponsiveLayout component that adapts to device type
 */
export const ResponsiveLayout = (props: ResponsiveLayoutProps): JSX.Element => {
  const {
    design,
    mode,
    context,
    assets,
    selectedCategory,
    searchQuery,
    onDesignUpdate,
    onAssetSelect,
    onCategoryFilter,
    onSearch,
    onSubmit,
    isSubmitted,
  } = props;

  const deviceType = detectDeviceType(context);
  const dimensions = getLayoutDimensions(deviceType);
  const styles = getResponsiveStyles(deviceType);

  // Desktop layout: grid-based, side-by-side panels
  if (deviceType === 'desktop') {
    return (
      <vstack width="100%" height="100%" gap="none">
        {mode === 'edit' ? (
          // Edit mode: Canvas on left, Asset Library on right
          <hstack width="100%" height="100%" gap="none">
            {/* Left panel: Canvas (60% width) */}
            <vstack width={dimensions.canvasWidth} height={dimensions.canvasHeight}>
              <CanvasController
                design={design}
                mode={mode}
                onDesignUpdate={onDesignUpdate}
                onSubmit={onSubmit}
                isSubmitted={isSubmitted}
              />
            </vstack>

            {/* Right panel: Asset Library (40% width) */}
            <vstack 
              width={dimensions.assetLibraryWidth} 
              height={dimensions.assetLibraryHeight} 
              backgroundColor="#F9FAFB"
              borderColor="#E5E7EB"
            >
              <AssetLibrary
                assets={assets}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onAssetSelect={onAssetSelect}
                onCategoryFilter={onCategoryFilter}
                onSearch={onSearch}
              />
            </vstack>
          </hstack>
        ) : (
          // Preview mode: Full-width canvas
          <vstack width="100%" height="100%">
            <CanvasController
              design={design}
              mode={mode}
              onDesignUpdate={onDesignUpdate}
              onSubmit={onSubmit}
              isSubmitted={isSubmitted}
            />
          </vstack>
        )}
      </vstack>
    );
  }

  // Mobile layout: stacked, touch-optimized
  return (
    <vstack width="100%" height="100%" gap="none">
      {mode === 'edit' ? (
        // Edit mode: Canvas on top, Asset Library on bottom (scrollable)
        <vstack width="100%" height="100%" gap="small">
          {/* Top section: Canvas (70% height) */}
          <vstack width="100%" height={dimensions.canvasHeight}>
            <MobileCanvasController
              design={design}
              mode={mode}
              onDesignUpdate={onDesignUpdate}
            />
          </vstack>

          {/* Bottom section: Asset Library (30% height, optimized for scrolling) */}
          <vstack 
            width="100%" 
            height={dimensions.assetLibraryHeight}
            backgroundColor="#F9FAFB"
            borderColor="#E5E7EB"
          >
            {/* Mobile-optimized asset library with horizontal scrolling */}
            <vstack width="100%" height="100%" padding="small" gap="small">
              <text size="medium" weight="bold">Assets</text>
              
              {/* Category filters - horizontal scroll */}
              <hstack gap="small">
                <button
                  size="small"
                  appearance={selectedCategory === null ? 'primary' : 'secondary'}
                  onPress={() => onCategoryFilter(null)}
                >
                  All
                </button>
                <button
                  size="small"
                  appearance={selectedCategory === AssetCategory.BOOKSHELF ? 'primary' : 'secondary'}
                  onPress={() => onCategoryFilter(AssetCategory.BOOKSHELF)}
                >
                  Shelves
                </button>
                <button
                  size="small"
                  appearance={selectedCategory === AssetCategory.CHAIR ? 'primary' : 'secondary'}
                  onPress={() => onCategoryFilter(AssetCategory.CHAIR)}
                >
                  Chairs
                </button>
                <button
                  size="small"
                  appearance={selectedCategory === AssetCategory.DECORATION ? 'primary' : 'secondary'}
                  onPress={() => onCategoryFilter(AssetCategory.DECORATION)}
                >
                  Decor
                </button>
                <button
                  size="small"
                  appearance={selectedCategory === AssetCategory.RUG ? 'primary' : 'secondary'}
                  onPress={() => onCategoryFilter(AssetCategory.RUG)}
                >
                  Rugs
                </button>
              </hstack>
              
              {/* Asset grid - optimized for mobile */}
              <vstack grow>
                <AssetLibrary
                  assets={assets}
                  selectedCategory={selectedCategory}
                  searchQuery={searchQuery}
                  onAssetSelect={onAssetSelect}
                  onCategoryFilter={onCategoryFilter}
                  onSearch={onSearch}
                />
              </vstack>
            </vstack>
          </vstack>
        </vstack>
      ) : (
        // Preview mode: Full-screen canvas with submit button
        <vstack width="100%" height="100%">
          <MobileCanvasController
            design={design}
            mode={mode}
            onDesignUpdate={onDesignUpdate}
          />
          
          {/* Submit button for mobile preview */}
          {!isSubmitted && onSubmit && (
            <vstack 
              width="100%" 
              padding="medium" 
              backgroundColor="#FFFFFF"
              borderColor="#E5E7EB"
              alignment="center middle"
            >
              <button
                appearance="primary"
                size="large"
                onPress={onSubmit}
              >
                Submit Design
              </button>
            </vstack>
          )}
          
          {/* Already submitted message for mobile */}
          {isSubmitted && (
            <vstack 
              width="100%"
              padding="medium" 
              backgroundColor="#EFF6FF"
              alignment="center middle"
            >
              <text size="medium" weight="bold" color="#1E40AF">
                ✓ Design Submitted
              </text>
            </vstack>
          )}
        </vstack>
      )}
    </vstack>
  );
};
