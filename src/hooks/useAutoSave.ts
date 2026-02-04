/**
 * useAutoSave - React hook for auto-saving designs with debouncing
 * NOTE: Currently disabled - Devvit doesn't support useEffect/useRef
 */

import { useState } from '@devvit/public-api';
import { Design } from '../types/models.js';
import { AutoSaveManager, SaveStatus } from '../utils/AutoSaveManager.js';

export interface UseAutoSaveResult {
  saveStatus: SaveStatus;
  lastSaveTime: number;
  saveError?: string;
  forceSave: () => Promise<void>;
}

/**
 * Hook to manage auto-save functionality for a design
 * TODO: Reimplement without useEffect/useRef when Devvit supports them
 */
export function useAutoSave(
  design: Design | null,
  autoSaveManager: AutoSaveManager | null
): UseAutoSaveResult {
  const [saveStatus] = useState<SaveStatus>('idle');
  const [lastSaveTime] = useState<number>(0);
  const [saveError] = useState<string | undefined>(undefined);

  // Force save function
  const forceSave = async () => {
    if (!design || !autoSaveManager) {
      throw new Error('Cannot force save: design or autoSaveManager is null');
    }
    await autoSaveManager.forceSave(design);
  };

  return {
    saveStatus,
    lastSaveTime,
    saveError,
    forceSave,
  };
}
