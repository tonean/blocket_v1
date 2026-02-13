/**
 * AssetLibrary Component - Displays asset grid with search and filter capabilities
 * Allows users to browse and select assets for placement in their room design
 */

import { Devvit } from '@devvit/public-api';
import { Asset, AssetCategory } from '../types/models.js';

export interface AssetLibraryProps {
  assets: Asset[];
  selectedCategory?: AssetCategory | null;
  searchQuery?: string;
  onAssetSelect: (asset: Asset) => void;
  onCategoryFilter: (category: AssetCategory | null) => void;
  onSearch: (query: string) => void;
}

/**
 * AssetLibrary component that displays assets in a grid with filtering
 */
export const AssetLibrary = (props: AssetLibraryProps): JSX.Element => {
  const {
    assets,
    selectedCategory,
    searchQuery = '',
    onAssetSelect,
    onCategoryFilter,
    onSearch,
  } = props;

  // Filter assets based on search query and category
  let filteredAssets = [...assets];

  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredAssets = filteredAssets.filter((asset) =>
      asset.name.toLowerCase().includes(lowerQuery)
    );
  }

  if (selectedCategory) {
    filteredAssets = filteredAssets.filter(
      (asset) => asset.category === selectedCategory
    );
  }

  // Category filter buttons
  const categoryButtons = (
    <hstack gap="small" alignment="center middle">
      <button
        appearance={selectedCategory === null ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(null)}
      >
        All
      </button>
      <button
        appearance={selectedCategory === AssetCategory.BOOKSHELF ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.BOOKSHELF)}
      >
        Bookshelves
      </button>
      <button
        appearance={selectedCategory === AssetCategory.CHAIR ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.CHAIR)}
      >
        Chairs
      </button>
      <button
        appearance={selectedCategory === AssetCategory.DECORATION ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.DECORATION)}
      >
        Decorations
      </button>
      <button
        appearance={selectedCategory === AssetCategory.FURNITURE ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.FURNITURE)}
      >
        Furniture
      </button>
      <button
        appearance={selectedCategory === AssetCategory.ELECTRONICS ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.ELECTRONICS)}
      >
        Electronics
      </button>
      <button
        appearance={selectedCategory === AssetCategory.LIGHTING ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.LIGHTING)}
      >
        Lighting
      </button>
      <button
        appearance={selectedCategory === AssetCategory.PEOPLE ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.PEOPLE)}
      >
        People
      </button>
      <button
        appearance={selectedCategory === AssetCategory.RUG ? 'primary' : 'secondary'}
        onPress={() => onCategoryFilter(AssetCategory.RUG)}
      >
        Rugs
      </button>
    </hstack>
  );

  // Render asset grid
  const renderAssetGrid = () => {
    if (filteredAssets.length === 0) {
      return (
        <vstack alignment="center middle" padding="large">
          <text size="medium" color="#6B7280">
            No assets found
          </text>
          {searchQuery && (
            <text size="small" color="#9CA3AF">
              Try a different search term
            </text>
          )}
        </vstack>
      );
    }

    // Create rows of assets (3 per row)
    const rows: Asset[][] = [];
    for (let i = 0; i < filteredAssets.length; i += 3) {
      rows.push(filteredAssets.slice(i, i + 3));
    }

    return (
      <vstack gap="medium" alignment="start top">
        {rows.map((row, rowIndex) => (
          <hstack key={`row-${rowIndex}`} gap="medium" alignment="start top">
            {row.map((asset) => (
              <vstack
                key={asset.id}
                alignment="center middle"
                padding="small"
                cornerRadius="small"
                backgroundColor="#FFFFFF"
                borderColor="#E5E7EB"
                onPress={() => onAssetSelect(asset)}
              >
                <image
                  url={asset.thumbnailUrl}
                  imageWidth={80}
                  imageHeight={80}
                  description={asset.name}
                />
                <text size="xsmall" alignment="center">
                  {asset.name}
                </text>
              </vstack>
            ))}
          </hstack>
        ))}
      </vstack>
    );
  };

  return (
    <vstack
      width="100%"
      height="100%"
      backgroundColor="#F3F4F6"
      padding="medium"
      gap="medium"
    >
      {/* Header */}
      <text size="large" weight="bold">
        Asset Library
      </text>

      {/* Search bar */}
      <vstack gap="small">
        <text size="small" weight="bold">
          Search
        </text>
        <textInput
          placeholder="Search assets..."
          value={searchQuery}
          onChangeText={(value) => onSearch(value)}
        />
      </vstack>

      {/* Category filters */}
      <vstack gap="small">
        <text size="small" weight="bold">
          Category
        </text>
        {categoryButtons}
      </vstack>

      {/* Asset grid */}
      <vstack grow>
        {renderAssetGrid()}
      </vstack>
    </vstack>
  );
};
