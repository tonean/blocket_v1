/**
 * AutoSaveManager - Handles debounced auto-save functionality for designs
 * Saves design state after 2 seconds of inactivity
 */

import { Design } from '../types/models.js';
import { StorageService } from '../storage/StorageService.js';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveConfig {
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus, error?: string) => void;
}

export class AutoSaveManager {
  private storageService: StorageService;
  private debounceMs: number;
  private saveTimeout: NodeJS.Timeout | null = null;
  private currentStatus: SaveStatus = 'idle';
  private onStatusChange?: (status: SaveStatus, error?: string) => void;
  private lastSaveTime: number = 0;

  constructor(storageService: StorageService, config: AutoSaveConfig = {}) {
    this.storageService = storageService;
    this.debounceMs = config.debounceMs || 2000; // Default 2 seconds
    this.onStatusChange = config.onStatusChange;
  }

  /**
   * Schedule an auto-save for the given design
   * Debounces multiple calls within the debounce window
   */
  scheduleAutoSave(design: Design): void {
    // Clear any existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // Set status to idle (waiting for debounce)
    this.setStatus('idle');

    // Schedule new save after debounce period
    this.saveTimeout = setTimeout(() => {
      this.performSave(design);
    }, this.debounceMs);
  }

  /**
   * Perform the actual save operation
   */
  private performSave(design: Design): void {
    this.setStatus('saving');

    // Use Promise to handle async save but don't await in the method
    this.storageService.saveDesign(design)
      .then(() => {
        this.lastSaveTime = Date.now();
        this.setStatus('saved');

        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (this.currentStatus === 'saved') {
            this.setStatus('idle');
          }
        }, 2000);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Auto-save failed:', errorMessage);
        this.setStatus('error', errorMessage);

        // Reset to idle after 3 seconds
        setTimeout(() => {
          if (this.currentStatus === 'error') {
            this.setStatus('idle');
          }
        }, 3000);
      });
  }

  /**
   * Force an immediate save without debouncing
   */
  async forceSave(design: Design): Promise<void> {
    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    await this.performSave(design);
  }

  /**
   * Cancel any pending auto-save
   */
  cancelPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.setStatus('idle');
  }

  /**
   * Get the current save status
   */
  getStatus(): SaveStatus {
    return this.currentStatus;
  }

  /**
   * Get the timestamp of the last successful save
   */
  getLastSaveTime(): number {
    return this.lastSaveTime;
  }

  /**
   * Set the save status and notify listeners
   */
  private setStatus(status: SaveStatus, error?: string): void {
    this.currentStatus = status;
    if (this.onStatusChange) {
      this.onStatusChange(status, error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancelPendingSave();
  }
}
