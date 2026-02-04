/**
 * Header Component - Top navigation bar with hamburger menu and Preview/Edit toggle
 * Matches the screenshot design with "Blocket - [Username]'s Room" title
 */

import { Devvit } from '@devvit/public-api';

export interface HeaderProps {
    username: string;
    mode: 'edit' | 'preview';
    onModeChange: (mode: 'edit' | 'preview') => void;
    onMenuToggle: () => void;
}

/**
 * Header component with hamburger menu and mode toggle
 */
export const Header = (props: HeaderProps): JSX.Element => {
    const { username, mode, onModeChange, onMenuToggle } = props;

    return (
        <hstack
            width="100%"
            height="60px"
            backgroundColor="#F9E8E8"
            alignment="center"
            padding="medium"
            gap="medium"
        >
            {/* Left: Hamburger menu button */}
            <hstack alignment="start middle" grow>
                <vstack
                    padding="small"
                    cornerRadius="small"
                    onPress={onMenuToggle}
                >
                    <text size="xxlarge" weight="bold">☰</text>
                </vstack>

                {/* Title */}
                <hstack gap="small" alignment="start middle">
                    <text size="xlarge" weight="bold" color="#1F2937">
                        Blocket
                    </text>
                    <text size="large" color="#6B7280">
                        - {username}'s Room
                    </text>
                </hstack>
            </hstack>

            {/* Right: Preview/Edit toggle buttons */}
            <hstack
                gap="none"
                alignment="end middle"
                backgroundColor="#FFFFFF"
                cornerRadius="full"
                padding="xsmall"
            >
                <vstack
                    padding="small"
                    minWidth="80px"
                    cornerRadius="full"
                    backgroundColor={mode === 'preview' ? '#FFFFFF' : 'transparent'}
                    borderColor={mode === 'preview' ? '#E5E7EB' : 'transparent'}
                    alignment="center middle"
                    onPress={() => onModeChange('preview')}
                >
                    <text
                        size="medium"
                        weight={mode === 'preview' ? 'bold' : 'regular'}
                        color={mode === 'preview' ? '#1F2937' : '#9CA3AF'}
                    >
                        Preview
                    </text>
                </vstack>

                <vstack
                    padding="small"
                    minWidth="60px"
                    cornerRadius="full"
                    backgroundColor={mode === 'edit' ? '#FFFFFF' : 'transparent'}
                    borderColor={mode === 'edit' ? '#E5E7EB' : 'transparent'}
                    alignment="center middle"
                    onPress={() => onModeChange('edit')}
                >
                    <text
                        size="medium"
                        weight={mode === 'edit' ? 'bold' : 'regular'}
                        color={mode === 'edit' ? '#1F2937' : '#9CA3AF'}
                    >
                        Edit
                    </text>
                </vstack>
            </hstack>
        </hstack>
    );
};
