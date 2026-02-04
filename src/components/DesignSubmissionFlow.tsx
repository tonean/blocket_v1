/**
 * DesignSubmissionFlow - Manages the complete submission flow including UI, confirmation, and error handling
 */

import { Devvit, useState, Context } from '@devvit/public-api';
import { Design } from '../types/models.js';
import { CanvasController } from './CanvasController.js';
import { SubmissionConfirmation } from './SubmissionConfirmation.js';
import { SubmissionError } from './SubmissionError.js';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { StorageService } from '../storage/StorageService.js';
import { AuthService } from '../services/AuthService.js';

export interface DesignSubmissionFlowProps {
  design: Design;
  mode: 'edit' | 'preview';
  context: Context;
  onDesignUpdate: (design: Design) => void;
  onSubmissionComplete?: () => void;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error' | 'already-submitted' | 'not-authenticated';

/**
 * DesignSubmissionFlow component that manages the entire submission process
 */
export const DesignSubmissionFlow = (props: DesignSubmissionFlowProps): JSX.Element => {
  const { design, mode, context, onDesignUpdate, onSubmissionComplete } = props;

  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [submittedDesignId, setSubmittedDesignId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(design.submitted);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  /**
   * Handle design submission
   */
  const handleSubmit = async () => {
    try {
      setSubmissionState('submitting');

      // Create a wrapper for Devvit's Redis client to match our interface
      const redisWrapper = {
        get: (key: string) => context.redis.get(key),
        set: (key: string, value: string) => context.redis.set(key, value),
        del: (key: string) => context.redis.del(key),
        sAdd: (key: string, members: string[]) => context.redis.sAdd(key, members),
        sMembers: (key: string) => context.redis.sMembers(key),
        zAdd: (key: string, members: { member: string; score: number }[]) => 
          context.redis.zAdd(key, members),
        zRevRange: (key: string, start: number, stop: number) => 
          context.redis.zRange(key, start, stop, { reverse: true }),
        zRevRank: (key: string, member: string) => 
          context.redis.zRank(key, member, { reverse: true }),
        zIncrBy: (key: string, increment: number, member: string) => 
          context.redis.zIncrBy(key, member, increment),
      };

      // Initialize services
      const storage = new StorageService(redisWrapper);
      const authService = new AuthService(context);
      const submissionHandler = new SubmissionHandler(storage, authService);

      // Check authentication
      const user = await authService.getCurrentUser();
      if (!user) {
        setSubmissionState('not-authenticated');
        setIsAuthenticated(false);
        setErrorMessage('Please log in to Reddit to submit your design.');
        return;
      }

      // Update design with authenticated user info
      const authenticatedDesign: Design = {
        ...design,
        userId: user.id,
        username: user.username,
      };

      // Check if user has already submitted for this theme
      const hasSubmitted = await submissionHandler.hasUserSubmitted(user.id, design.themeId);
      
      if (hasSubmitted) {
        setSubmissionState('already-submitted');
        setIsSubmitted(true);
        setErrorMessage('You have already submitted a design for this theme.');
        return;
      }

      // Submit the design
      const designId = await submissionHandler.submitDesign(authenticatedDesign);
      
      // Update state
      setSubmittedDesignId(designId);
      setSubmissionState('success');
      setIsSubmitted(true);

      // Update the design object to mark as submitted
      const updatedDesign: Design = {
        ...authenticatedDesign,
        submitted: true,
        updatedAt: Date.now()
      };
      onDesignUpdate(updatedDesign);

    } catch (error) {
      console.error('Submission error:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Authentication required')) {
        setSubmissionState('not-authenticated');
        setIsAuthenticated(false);
        setErrorMessage('Please log in to Reddit to submit your design.');
      } else {
        setSubmissionState('error');
        setErrorMessage(
          error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred. Please try again.'
        );
      }
    }
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    setSubmissionState('idle');
    setErrorMessage('');
    handleSubmit();
  };

  /**
   * Handle cancel/close
   */
  const handleClose = () => {
    setSubmissionState('idle');
    setErrorMessage('');
    
    if (onSubmissionComplete) {
      onSubmissionComplete();
    }
  };

  // Show success confirmation
  if (submissionState === 'success') {
    return (
      <SubmissionConfirmation
        designId={submittedDesignId}
        onClose={handleClose}
      />
    );
  }

  // Show error message or login prompt
  if (submissionState === 'error' || submissionState === 'already-submitted' || submissionState === 'not-authenticated') {
    return (
      <SubmissionError
        errorMessage={errorMessage}
        onRetry={submissionState === 'error' ? handleRetry : handleClose}
        onCancel={handleClose}
        showLoginPrompt={submissionState === 'not-authenticated'}
      />
    );
  }

  // Show submitting state
  if (submissionState === 'submitting') {
    return (
      <vstack
        width="100%"
        height="100%"
        alignment="center middle"
        backgroundColor="rgba(0, 0, 0, 0.5)"
      >
        <vstack
          backgroundColor="#FFFFFF"
          cornerRadius="large"
          padding="large"
          gap="medium"
          alignment="center middle"
        >
          <text size="large" weight="bold">Submitting Design...</text>
          <text size="medium" color="#6B7280">Please wait</text>
        </vstack>
      </vstack>
    );
  }

  // Show canvas with submit button
  return (
    <CanvasController
      design={design}
      mode={mode}
      onDesignUpdate={onDesignUpdate}
      onSubmit={handleSubmit}
      isSubmitted={isSubmitted}
    />
  );
};
