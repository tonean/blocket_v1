import { useState, useEffect, useRef, useCallback } from 'react';
import { useInit } from '../hooks/useInit';

interface Asset {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
}

interface PlacedAsset {
    id: string;
    assetId: string;
    // Position as offset from center in percentage (-50 to +50)
    xOffset: number; // negative = left of center, positive = right of center
    yOffset: number; // negative = above center, positive = below center
    scale: number;
    flipped: boolean; // horizontal flip
}

const ASSETS: Asset[] = [
    { id: 'desk', name: 'Desk', category: 'furniture', imageUrl: 'desk.png' },
    { id: 'chair_1', name: 'Chair 1', category: 'furniture', imageUrl: 'chair_1.png' },
    { id: 'chair_2', name: 'Chair 2', category: 'furniture', imageUrl: 'chair_2.png' },
    { id: 'laptop', name: 'Laptop', category: 'electronics', imageUrl: 'laptop.png' },
    { id: 'lamp', name: 'Lamp', category: 'lighting', imageUrl: 'lamp.png' },
    { id: 'bookshelf_1', name: 'Bookshelf', category: 'furniture', imageUrl: 'bookshelf_1.png' },
    { id: 'clock', name: 'Clock', category: 'decor', imageUrl: 'clock.png' },
    { id: 'cup', name: 'Cup', category: 'decor', imageUrl: 'cup.png' },
    { id: 'rug_1', name: 'Rug', category: 'decor', imageUrl: 'rug_1.png' },
    { id: 'mouse', name: 'Mouse', category: 'electronics', imageUrl: 'mouse.png' },
];

const COLORS = ['#f1e1d6', '#FFFFFF', '#FFA500', '#4169E1', '#228B22', '#FF1493', '#8B4513', '#FFD700', '#9370DB', '#FF6347'];

export const App = () => {
    const { postId, username, theme, loading } = useInit();
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [currentView, setCurrentView] = useState<'design' | 'gallery' | 'viewing' | 'leaderboard' | 'saved'>('design');
    const [searchQuery, setSearchQuery] = useState('');
    const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [bottomSheetHeight, setBottomSheetHeight] = useState(35);
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizingSheet, setIsResizingSheet] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isOverTrash, setIsOverTrash] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState('#f1e1d6');
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [heartAnimation, setHeartAnimation] = useState(false);
    const [fallingHearts, setFallingHearts] = useState<Array<{ id: number, left: number, delay: number }>>([]);
    const [likeCount, setLikeCount] = useState(0);
    const [wasUpdate, setWasUpdate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [galleryDesigns, setGalleryDesigns] = useState<any[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [viewingDesign, setViewingDesign] = useState<any | null>(null);
    const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
    const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const trashRef = useRef<HTMLDivElement>(null);
    const roomImageRef = useRef<HTMLImageElement>(null);

    // 24-hour countdown timer
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setHours(24, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 500);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Keyboard handler - R to flip horizontally
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'r' && selectedAssetId && mode === 'edit') {
                setPlacedAssets(prev => prev.map(p =>
                    p.id === selectedAssetId ? { ...p, flipped: !p.flipped } : p
                ));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAssetId, mode]);

    // Handle resizing bottom sheet
    useEffect(() => {
        if (!isResizingSheet) return;
        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const newHeight = ((window.innerHeight - clientY) / window.innerHeight) * 100;
            setBottomSheetHeight(Math.min(70, Math.max(20, newHeight)));
        };
        const handleUp = () => setIsResizingSheet(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isResizingSheet]);

    // Submit design to server
    const submitDesign = async () => {
        if (isSubmitting) return;

        setWasUpdate(isSubmitted);
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const themeId = theme?.id || 'default';

            // Create the design object
            const design = {
                id: `design-${Date.now()}`,
                userId: username,
                username: username,
                themeId: themeId,
                assets: placedAssets,
                backgroundColor: backgroundColor,
                submitted: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                voteCount: 0,
            };

            // First, save the design
            const saveResponse = await fetch('/api/design/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ design }),
            });

            if (!saveResponse.ok) {
                throw new Error('Failed to save design');
            }

            // Then submit the design
            const submitResponse = await fetch('/api/design/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId: themeId }),
            });

            if (!submitResponse.ok) {
                throw new Error('Failed to submit design');
            }

            setIsSubmitted(true);
            setShowSubmitModal(true);
        } catch (error) {
            console.error('Submit error:', error);
            setSubmitError(error instanceof Error ? error.message : 'Failed to submit');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch gallery designs
    const fetchGallery = async () => {
        setLoadingGallery(true);
        try {
            const themeId = theme?.id || 'default';
            const response = await fetch(`/api/gallery?themeId=${themeId}`);
            if (response.ok) {
                const data = await response.json();
                setGalleryDesigns(data.designs || []);
            }
        } catch (error) {
            console.error('Failed to load gallery:', error);
        } finally {
            setLoadingGallery(false);
        }
    };

    // Navigate to gallery
    const goToGallery = () => {
        setCurrentView('gallery');
        fetchGallery();
    };

    // View a design from gallery
    const viewDesign = (design: any) => {
        setViewingDesign(design);
        setCurrentView('viewing');
    };

    // Vote on a design
    const voteOnDesign = async (designId: string) => {
        // Toggle vote locally
        const alreadyVoted = userVotes[designId];
        setUserVotes(prev => ({ ...prev, [designId]: !alreadyVoted }));

        // Update the gallery design's vote count locally
        setGalleryDesigns(prev => prev.map(d => {
            if (d.id === designId) {
                return {
                    ...d,
                    voteCount: (d.voteCount || 0) + (alreadyVoted ? -1 : 1)
                };
            }
            return d;
        }));

        // Also update viewingDesign if currently viewing this design
        if (viewingDesign?.id === designId) {
            setViewingDesign((prev: any) => ({
                ...prev,
                voteCount: (prev.voteCount || 0) + (alreadyVoted ? -1 : 1)
            }));
        }

        // Send to server
        try {
            await fetch('/api/design/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId, vote: !alreadyVoted }),
            });
        } catch (error) {
            console.error('Vote failed:', error);
            // Revert on error
            setUserVotes(prev => ({ ...prev, [designId]: alreadyVoted }));
        }
    };

    // Add asset - position as offset from center
    const handleAssetClick = (asset: Asset) => {
        const newAsset: PlacedAsset = {
            id: `${asset.id}-${Date.now()}`,
            assetId: asset.id,
            // Start near center with slight offset for each new asset
            xOffset: -5 + (placedAssets.length * 3) % 15,
            yOffset: -5 + (placedAssets.length * 4) % 15,
            scale: 1,
            flipped: false,
        };
        setPlacedAssets(prev => [...prev, newAsset]);
        setSelectedAssetId(newAsset.id);
        if (isMobile) setIsBottomSheetOpen(false);
    };

    // Start dragging
    const handleMouseDown = (e: React.MouseEvent, placedId: string) => {
        if (mode !== 'edit') return;
        e.preventDefault();
        e.stopPropagation();
        const placed = placedAssets.find(p => p.id === placedId);
        if (!placed || !canvasRef.current || !roomImageRef.current) return;
        setSelectedAssetId(placedId);
        setIsDragging(true);
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const imgRect = roomImageRef.current.getBoundingClientRect();
        const imgCenterX = imgRect.left - canvasRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top - canvasRect.top + imgRect.height / 2;
        // Current position in pixels from canvas top-left, relative to room image center
        const currentX = imgCenterX + (placed.xOffset / 100) * imgRect.width;
        const currentY = imgCenterY + (placed.yOffset / 100) * imgRect.height;
        setDragOffset({ x: e.clientX - canvasRect.left - currentX, y: e.clientY - canvasRect.top - currentY });
    };

    // Mouse move - convert to offset from center
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !selectedAssetId || !canvasRef.current || !roomImageRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const imgRect = roomImageRef.current.getBoundingClientRect();
        const imgCenterX = imgRect.left - canvasRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top - canvasRect.top + imgRect.height / 2;
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        // Convert to offset from room image center as percentage of room image size
        const xOffset = ((x - imgCenterX) / imgRect.width) * 100;
        const yOffset = ((y - imgCenterY) / imgRect.height) * 100;
        // Clamp to reasonable bounds
        const clampedX = Math.max(-45, Math.min(45, xOffset));
        const clampedY = Math.max(-45, Math.min(45, yOffset));
        if (trashRef.current) {
            const tr = trashRef.current.getBoundingClientRect();
            setIsOverTrash(e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom);
        }
        setPlacedAssets(prev => prev.map(p =>
            p.id === selectedAssetId ? { ...p, xOffset: clampedX, yOffset: clampedY } : p
        ));
    }, [isDragging, selectedAssetId, dragOffset]);

    // Mouse up
    const handleMouseUp = useCallback(() => {
        if (isDragging && isOverTrash && selectedAssetId) {
            setPlacedAssets(prev => prev.filter(p => p.id !== selectedAssetId));
            setSelectedAssetId(null);
        }
        setIsDragging(false);
        setIsOverTrash(false);
    }, [isDragging, isOverTrash, selectedAssetId]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Touch handlers
    const handleTouchStart = (e: React.TouchEvent, placedId: string) => {
        if (mode !== 'edit') return;
        e.stopPropagation();
        const touch = e.touches[0];
        const placed = placedAssets.find(p => p.id === placedId);
        if (!placed || !canvasRef.current || !roomImageRef.current) return;
        setSelectedAssetId(placedId);
        setIsDragging(true);
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const imgRect = roomImageRef.current.getBoundingClientRect();
        const imgCenterX = imgRect.left - canvasRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top - canvasRect.top + imgRect.height / 2;
        const currentX = imgCenterX + (placed.xOffset / 100) * imgRect.width;
        const currentY = imgCenterY + (placed.yOffset / 100) * imgRect.height;
        setDragOffset({ x: touch.clientX - canvasRect.left - currentX, y: touch.clientY - canvasRect.top - currentY });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !selectedAssetId || !canvasRef.current || !roomImageRef.current) return;
        e.preventDefault();
        const touch = e.touches[0];
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const imgRect = roomImageRef.current.getBoundingClientRect();
        const imgCenterX = imgRect.left - canvasRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top - canvasRect.top + imgRect.height / 2;
        const x = touch.clientX - canvasRect.left - dragOffset.x;
        const y = touch.clientY - canvasRect.top - dragOffset.y;
        const xOffset = ((x - imgCenterX) / imgRect.width) * 100;
        const yOffset = ((y - imgCenterY) / imgRect.height) * 100;
        const clampedX = Math.max(-45, Math.min(45, xOffset));
        const clampedY = Math.max(-45, Math.min(45, yOffset));
        if (trashRef.current) {
            const tr = trashRef.current.getBoundingClientRect();
            setIsOverTrash(touch.clientX >= tr.left && touch.clientX <= tr.right && touch.clientY >= tr.top && touch.clientY <= tr.bottom);
        }
        setPlacedAssets(prev => prev.map(p =>
            p.id === selectedAssetId ? { ...p, xOffset: clampedX, yOffset: clampedY } : p
        ));
    };

    const handleTouchEnd = () => {
        if (isDragging && isOverTrash && selectedAssetId) {
            setPlacedAssets(prev => prev.filter(p => p.id !== selectedAssetId));
            setSelectedAssetId(null);
        }
        setIsDragging(false);
        setIsOverTrash(false);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1e1d6' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎨</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', height: '100vh', background: '#f1e1d6', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* Blue background image - HIDDEN */}
            {/* {currentView === 'design' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(blue_background_2.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    zIndex: 0,
                }} />
            )} */}

            {/* Header - hide when viewing a design */}
            {currentView !== 'viewing' && (
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: currentView === 'design' ? 'transparent' : '#1A1A1F', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <button style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#FFF' }} onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
                        {currentView === 'design' ? (
                            <>
                                {/* Logo hidden */}
                                {/* <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                                    <img src="Blocket_text.png" alt="Blocket" style={{ height: isMobile ? '28px' : '64px', objectFit: 'contain' }} />
                                </div> */}
                                {!isMobile && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <span style={{ fontFamily: 'PublicPixel, cursive, monospace', fontSize: '12px', color: 'rgba(190, 160, 130, 1)', animation: 'subtleFloat 3s ease-in-out infinite' }}>Theme: Classroom</span>
                                        <span style={{ fontFamily: 'PublicPixel, cursive, monospace', fontSize: '14px', color: '#C75B5B', animation: 'timerPulse 5s ease-in-out infinite' }}>{timeLeft}</span>
                                    </div>
                                )}
                                {isMobile && (
                                    <span style={{
                                        fontFamily: 'PublicPixel, cursive, monospace',
                                        fontSize: '8px',
                                        color: '#d3d3d3',
                                        marginLeft: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '2px',
                                    }}>
                                        <span>Theme: Classroom</span>
                                        <span style={{ fontFamily: 'PublicPixel, cursive, monospace', fontSize: '10px', color: '#C75B5B', animation: 'timerPulse 5s ease-in-out infinite' }}>{timeLeft}</span>
                                    </span>
                                )}
                            </>
                        ) : currentView === 'gallery' ? (
                            <>
                                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: '#FFF', marginLeft: '8px' }}>Gallery</span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#2A2A30',
                                    borderRadius: '20px',
                                    padding: '8px 14px',
                                    marginLeft: '24px',
                                    gap: '8px',
                                    flex: 1,
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search user..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'none',
                                            border: 'none',
                                            outline: 'none',
                                            color: '#FFFFFF',
                                            fontSize: '14px',
                                            width: '100%',
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#6B7280',
                                                cursor: 'pointer',
                                                padding: '0',
                                                fontSize: '12px',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : currentView === 'leaderboard' ? (
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: '#FFF', marginLeft: '8px' }}>Leaderboard</span>
                        ) : currentView === 'saved' ? (
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: '#FFF', marginLeft: '8px' }}>My Saved Rooms</span>
                        ) : null}
                    </div>
                    {currentView === 'design' && (
                        <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: '20px', padding: '3px', animation: 'gentleGlow 4s ease-in-out infinite' }}>
                            <button onClick={() => setMode('preview')} style={{ padding: isMobile ? '5px 10px' : '6px 14px', border: 'none', borderRadius: '18px', background: mode === 'preview' ? 'rgba(255, 255, 255, 0.9)' : 'transparent', cursor: 'pointer', fontWeight: '500', fontSize: isMobile ? '8px' : '10px', boxShadow: mode === 'preview' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', color: mode === 'preview' ? '#333' : 'rgba(190, 160, 130, 1)', transition: 'all 0.3s ease' }}>Preview</button>
                            <button onClick={() => setMode('edit')} style={{ padding: isMobile ? '5px 10px' : '6px 14px', border: 'none', borderRadius: '18px', background: mode === 'edit' ? 'rgba(255, 255, 255, 0.9)' : 'transparent', cursor: 'pointer', fontWeight: '500', fontSize: isMobile ? '8px' : '10px', boxShadow: mode === 'edit' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', color: mode === 'edit' ? '#333' : '#FFF', transition: 'all 0.3s ease' }}>Edit</button>
                        </div>
                    )}
                </header>
            )}

            {/* Menu Drawer */}
            {isMenuOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: '56px', paddingLeft: '12px' }} onClick={() => setIsMenuOpen(false)}>
                    <div style={{
                        width: '180px',
                        backgroundColor: 'rgba(225, 215, 200, 0.6)',
                        borderRadius: '12px',
                        padding: '8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',

                    }} onClick={e => e.stopPropagation()}>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <a style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                                textDecoration: 'none',
                                backgroundColor: currentView === 'design' ? 'rgba(255,255,255,0.15)' : 'transparent',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentView === 'design' ? 'rgba(255,255,255,0.15)' : 'transparent'}
                                onClick={() => { setCurrentView('design'); setIsMenuOpen(false); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                My Room
                            </a>
                            <a style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                                textDecoration: 'none',
                                backgroundColor: currentView === 'gallery' ? 'rgba(255,255,255,0.15)' : 'transparent',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentView === 'gallery' ? 'rgba(255,255,255,0.15)' : 'transparent'}
                                onClick={() => { goToGallery(); setIsMenuOpen(false); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21,15 16,10 5,21" />
                                </svg>
                                Gallery
                            </a>
                            <a style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                                textDecoration: 'none',
                                backgroundColor: currentView === 'leaderboard' ? 'rgba(255,255,255,0.15)' : 'transparent',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentView === 'leaderboard' ? 'rgba(255,255,255,0.15)' : 'transparent'}
                                onClick={() => { setCurrentView('leaderboard'); fetchGallery(); setIsMenuOpen(false); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                    <path d="M4 22h16" />
                                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                                </svg>
                                Leaderboard
                            </a>
                            <a style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                                textDecoration: 'none',
                                backgroundColor: currentView === 'saved' ? 'rgba(255,255,255,0.15)' : 'transparent',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentView === 'saved' ? 'rgba(255,255,255,0.15)' : 'transparent'}
                                onClick={() => { setCurrentView('saved'); fetchGallery(); setIsMenuOpen(false); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                                My Saved Rooms
                            </a>
                        </nav>
                    </div>
                </div>
            )
            }

            {/* Main Content */}
            {
                currentView === 'gallery' ? (
                    /* Gallery View */
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'auto', backgroundColor: '#1A1A1F' }}>


                        {loadingGallery && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                Loading gallery...
                            </div>
                        )}

                        {/* Empty state */}
                        {!loadingGallery && galleryDesigns.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: '#9CA3AF',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎨</div>
                                <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '8px' }}>No Designs Yet</h3>
                                <p style={{ marginBottom: '20px' }}>Be the first to submit a design!</p>
                                <button
                                    onClick={() => setCurrentView('design')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4A90D9',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                    }}
                                >
                                    Create Design
                                </button>
                            </div>
                        )}

                        {/* Gallery Grid */}
                        {!loadingGallery && galleryDesigns.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '16px',
                            }}>
                                {galleryDesigns
                                    .filter(design => !searchQuery || design.username?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((design, index) => (
                                        <div
                                            key={design.id || index}
                                            style={{
                                                backgroundColor: '#2A2A30',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                            }}
                                            onClick={() => viewDesign(design)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            {/* Thumbnail - shows design background and assets */}
                                            <div style={{
                                                width: '100%',
                                                height: '160px',
                                                backgroundColor: design.backgroundColor || '#3A3A45',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}>
                                                {/* Room base image */}
                                                <img
                                                    src="room_2.png"
                                                    alt="Room design"
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                                {/* Render actual assets as mini thumbnails */}
                                                {design.assets?.map((asset: any, assetIndex: number) => {
                                                    const assetData = ASSETS.find(a => a.id === asset.assetId);
                                                    if (!assetData) return null;
                                                    return (
                                                        <img
                                                            key={assetIndex}
                                                            src={assetData.imageUrl}
                                                            alt="Asset"
                                                            style={{
                                                                position: 'absolute',
                                                                left: `calc(50% + ${asset.xOffset * 0.8}%)`,
                                                                top: `calc(50% + ${asset.yOffset * 0.8}%)`,
                                                                transform: `translate(-50%, -50%) rotate(${asset.rotation || 0}deg) scale(${(asset.scale || 1) * 0.4})`,
                                                                width: '30px',
                                                                height: '30px',
                                                                objectFit: 'contain',
                                                                pointerEvents: 'none',
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* Info */}
                                            <div style={{ padding: '10px 12px' }}>
                                                <div style={{
                                                    color: '#FFFFFF',
                                                    fontWeight: '600',
                                                    fontSize: '10px',
                                                    marginBottom: '8px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '100%',
                                                }}>
                                                    {design.username || 'Anonymous'}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    {/* Vote button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            voteOnDesign(design.id);
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: userVotes[design.id] ? '#FF6B6B' : '#9CA3AF',
                                                            fontSize: '10px',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <span style={{ color: userVotes[design.id] ? '#FF6B6B' : '#FFFFFF' }}>♥</span>
                                                        <span>{design.voteCount || 0}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Refresh button fixed at bottom right */}
                        {!loadingGallery && (
                            <button
                                onClick={fetchGallery}
                                style={{
                                    position: 'fixed',
                                    bottom: '20px',
                                    right: '20px',
                                    padding: '12px 24px',
                                    backgroundColor: '#2A2A30',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    zIndex: 100,
                                }}
                            >
                                Refresh
                            </button>
                        )}
                    </main>
                ) : currentView === 'leaderboard' ? (
                    /* Leaderboard View */
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'auto', backgroundColor: '#1A1A1F' }}>

                        {/* Loading state */}
                        {loadingGallery && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                                    <div>Loading leaderboard...</div>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!loadingGallery && galleryDesigns.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
                                    <div style={{ fontSize: '16px' }}>No submissions yet!</div>
                                    <div style={{ fontSize: '14px', marginTop: '4px' }}>Be the first to submit a design</div>
                                </div>
                            </div>
                        )}

                        {/* Leaderboard list - sorted by votes */}
                        {!loadingGallery && galleryDesigns.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[...galleryDesigns]
                                    .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                                    .map((design, index) => (
                                        <div
                                            key={design.id || index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px',
                                                backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#2A2A30',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                            }}
                                            onClick={() => viewDesign(design)}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                        >
                                            {/* Rank */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: index < 3 ? 'rgba(0,0,0,0.2)' : '#1A1A1F',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                color: index < 3 ? '#000' : '#FFF',
                                            }}>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                            </div>

                                            {/* Thumbnail */}
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '8px',
                                                backgroundColor: design.backgroundColor || '#3A3A45',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}>
                                                <img
                                                    src="room_2.png"
                                                    alt="Room"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>

                                            {/* User info */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    color: index < 3 ? '#000' : '#FFFFFF',
                                                    fontWeight: '600',
                                                    fontSize: '16px',
                                                }}>
                                                    {design.username || 'Anonymous'}
                                                </div>
                                            </div>

                                            {/* Votes */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: index < 3 ? '#000' : '#FF6B6B',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                            }}>
                                                <span>♥</span>
                                                <span>{design.voteCount || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </main>
                ) : currentView === 'saved' ? (
                    /* My Saved Rooms View */
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'auto', backgroundColor: '#1A1A1F' }}>

                        {/* Loading state */}
                        {loadingGallery && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                                    <div>Loading saved rooms...</div>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!loadingGallery && galleryDesigns.filter(d => d.username === username || userVotes[d.id]).length === 0 && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
                                    <div style={{ fontSize: '16px' }}>No saved rooms yet!</div>
                                    <div style={{ fontSize: '14px', marginTop: '4px' }}>Submit a design or like rooms in the gallery</div>
                                </div>
                            </div>
                        )}

                        {/* Saved rooms grid */}
                        {!loadingGallery && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '16px',
                            }}>
                                {galleryDesigns
                                    .filter(design => design.username === username || userVotes[design.id])
                                    .map((design, index) => (
                                        <div
                                            key={design.id || index}
                                            style={{
                                                backgroundColor: '#2A2A30',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                position: 'relative',
                                            }}
                                            onClick={() => viewDesign(design)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            {/* Badge indicator */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                backgroundColor: design.username === username ? '#4CAF50' : '#FF6B6B',
                                                color: '#FFFFFF',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                zIndex: 5,
                                            }}>
                                                {design.username === username ? 'Your Submission' : '♥ Liked'}
                                            </div>

                                            {/* Thumbnail */}
                                            <div style={{
                                                width: '100%',
                                                height: '160px',
                                                backgroundColor: design.backgroundColor || '#f1e1d6',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}>
                                                <img
                                                    src="room_2.png"
                                                    alt="Room"
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        objectFit: 'contain',
                                                    }}
                                                />
                                                {design.assets?.slice(0, 5).map((asset: any, i: number) => (
                                                    <img
                                                        key={i}
                                                        src={ASSETS.find(a => a.id === asset.assetId)?.imageUrl || ''}
                                                        alt=""
                                                        style={{
                                                            position: 'absolute',
                                                            left: `calc(50% + ${asset.xOffset * 0.6}%)`,
                                                            top: `calc(50% + ${asset.yOffset * 0.6}%)`,
                                                            transform: `translate(-50%, -50%) rotate(${asset.rotation || 0}deg) scale(${(asset.scale || 1) * 0.4})`,
                                                            width: '30px',
                                                            height: '30px',
                                                            objectFit: 'contain',
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Card footer */}
                                            <div style={{ padding: '12px' }}>
                                                <div style={{
                                                    color: '#FFFFFF',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    marginBottom: '4px',
                                                }}>
                                                    {design.username || 'Anonymous'}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#FF6B6B',
                                                    fontSize: '10px',
                                                }}>
                                                    <span>♥</span>
                                                    <span>{design.voteCount || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Refresh button fixed at bottom right */}
                        {!loadingGallery && (
                            <button
                                onClick={fetchGallery}
                                style={{
                                    position: 'fixed',
                                    bottom: '20px',
                                    right: '20px',
                                    padding: '12px 24px',
                                    backgroundColor: '#2A2A30',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    zIndex: 100,
                                }}
                            >
                                Refresh
                            </button>
                        )}
                    </main>
                ) : currentView === 'viewing' && viewingDesign ? (
                    /* Viewing Someone's Design - Full Screen */
                    <main style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: viewingDesign.backgroundColor || '#f1e1d6',
                    }}>
                        {/* Room fills entire space */}
                        <img
                            src="room_2.png"
                            alt="Room"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                maxWidth: '98%',
                                maxHeight: '98%',
                                objectFit: 'contain',
                            }}
                        />

                        {/* Render placed assets */}
                        {viewingDesign.assets?.map((asset: any) => (
                            <img
                                key={asset.id}
                                src={ASSETS.find(a => a.id === asset.assetId)?.imageUrl || ''}
                                alt="Asset"
                                style={{
                                    position: 'absolute',
                                    left: `calc(50% + ${asset.xOffset}%)`,
                                    top: `calc(50% + ${asset.yOffset}%)`,
                                    transform: `translate(-50%, -50%) rotate(${asset.rotation || 0}deg) scale(${asset.scale || 1})`,
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'contain',
                                    pointerEvents: 'none',
                                }}
                            />
                        ))}

                        {/* Control bar overlay at top */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            right: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            zIndex: 10,
                        }}>
                            {/* Menu button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '20px',

                                }}
                            >
                                ☰
                            </button>

                            {/* Back button */}
                            <button
                                onClick={() => { setViewingDesign(null); setCurrentView('gallery'); }}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '20px',

                                }}
                            >
                                ‹
                            </button>

                            {/* Username - takes remaining space */}
                            <div style={{
                                flex: 1,
                                padding: '10px 16px',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                borderRadius: '20px',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: '600',
                                textAlign: 'center',
                            }}>
                                {viewingDesign.username}'s Room
                            </div>

                            {/* Vote button */}
                            <button
                                onClick={() => voteOnDesign(viewingDesign.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 16px',
                                    backgroundColor: userVotes[viewingDesign.id] ? 'rgba(255,107,107,0.9)' : 'rgba(0,0,0,0.7)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',

                                    transition: 'all 0.2s',
                                }}
                            >
                                <span style={{ color: userVotes[viewingDesign.id] ? '#FF6B6B' : '#FFFFFF' }}>♥</span>
                                <span>{viewingDesign.voteCount || 0}</span>
                            </button>
                        </div>
                    </main>
                ) : (
                    /* Design View */
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '8px' : '16px', gap: '16px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

                        {/* Room Canvas */}
                        <div
                            ref={canvasRef}
                            style={{
                                position: 'relative',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                backgroundColor: 'transparent',
                                flex: 1,
                                minHeight: '250px',
                            }}
                            onClick={(e) => { if (e.target === canvasRef.current) setSelectedAssetId(null); }}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Room wrapper - maintains consistent aspect ratio for positioning */}
                            <div
                                ref={roomImageRef as any}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: (mode === 'edit' && !isMobile) ? 'calc(50% - 150px)' : '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '92%',
                                    maxHeight: '92%',
                                    width: '92%',
                                    aspectRatio: '4 / 3',
                                    zIndex: 2,
                                    transition: 'left 0.3s ease',
                                }}
                            >
                                {/* Room image */}
                                <img
                                    src="room_2.png"
                                    alt="Room"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                    draggable={false}
                                />

                                {/* Placed Assets - positioned relative to room image */}
                                {placedAssets.map((placed) => {
                                    const asset = ASSETS.find(a => a.id === placed.assetId);
                                    if (!asset) return null;
                                    return (
                                        <div
                                            key={placed.id}
                                            style={{
                                                position: 'absolute',
                                                // Position from center of room image
                                                left: `calc(50% + ${placed.xOffset}%)`,
                                                top: `calc(50% + ${placed.yOffset}%)`,
                                                transform: `translate(-50%, -50%) ${placed.flipped ? 'scaleX(-1)' : ''}`,
                                                width: '10%',
                                                aspectRatio: '1',
                                                border: isDragging && selectedAssetId === placed.id ? '3px solid #8B7355' : 'none',
                                                boxShadow: isDragging && selectedAssetId === placed.id ? '0 0 15px rgba(74, 144, 217, 0.6)' : 'none',
                                                cursor: mode === 'edit' ? 'grab' : 'default',
                                                zIndex: selectedAssetId === placed.id ? 100 : 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '4px',
                                                backgroundColor: 'transparent',
                                                pointerEvents: 'auto',
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, placed.id)}
                                            onTouchStart={(e) => handleTouchStart(e, placed.id)}
                                        >
                                            <img src={asset.imageUrl} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} draggable={false} />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Background Color Picker */}


                            {/* Submit Button - Preview Mode (always visible) */}
                            {mode === 'preview' && (
                                <>
                                    {/* Submitted indicator - shows above button */}
                                    {isSubmitted && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '70px',
                                            right: '16px',
                                            padding: '6px 12px',
                                            backgroundColor: '#10B981',
                                            color: '#FFFFFF',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span>✓</span> In Gallery
                                        </div>
                                    )}
                                    <button
                                        disabled={isSubmitting}
                                        style={{
                                            position: 'absolute',
                                            bottom: '16px',
                                            left: isMobile ? '16px' : '50%',
                                            transform: isMobile ? 'none' : 'translateX(-50%)',
                                            padding: '8px 18px',
                                            backgroundColor: isSubmitting ? 'rgba(107, 114, 128, 0.8)' : (isSubmitted ? 'rgba(139, 115, 85, 0.9)' : 'rgba(190, 160, 130, 0.9)'),
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: isSubmitting ? 'wait' : 'pointer',
                                            boxShadow: '0 4px 12px rgba(139, 115, 85, 0.4)',
                                            transition: 'all 0.2s',
                                            opacity: isSubmitting ? 0.7 : 1,
                                            zIndex: 10,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.backgroundColor = isSubmitted ? 'rgba(100, 80, 60, 1)' : 'rgba(160, 130, 100, 1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.backgroundColor = isSubmitted ? 'rgba(139, 115, 85, 0.9)' : 'rgba(190, 160, 130, 0.9)';
                                            }
                                        }}
                                        onClick={submitDesign}
                                    >
                                        {isSubmitting ? 'Submitting...' : (isSubmitted ? 'Update Design' : 'Submit Design')}
                                    </button>
                                </>
                            )}

                            {/* Error display */}
                            {submitError && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '110px',
                                    right: '16px',
                                    padding: '10px 16px',
                                    backgroundColor: '#EF4444',
                                    color: '#FFFFFF',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    maxWidth: '250px',
                                }}>
                                    {submitError}
                                </div>
                            )}

                            {/* Trash Zone */}
                            {mode === 'edit' && (
                                <div
                                    ref={trashRef}
                                    style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        left: '12px',
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '10px',
                                        border: '2px dashed',
                                        backgroundColor: isOverTrash ? '#FF4444' : 'transparent',
                                        borderColor: isOverTrash ? '#FF0000' : '#999',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        transform: isOverTrash ? 'scale(1.15)' : 'scale(1)',
                                    }}
                                >
                                    <span style={{ fontSize: '22px' }}>🗑️</span>
                                </div>
                            )}

                            {/* Heart icon in bottom right corner with like count - hidden in edit mode */}
                            {mode !== 'edit' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    right: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#FFFFFF',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                    }}>
                                        {likeCount}
                                    </span>
                                    <div
                                        onClick={() => {
                                            const newLikedState = !isLiked;
                                            setIsLiked(newLikedState);
                                            setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
                                            setHeartAnimation(true);
                                            setTimeout(() => setHeartAnimation(false), 600);

                                            // Create more falling hearts with varied timing
                                            const newHearts = Array.from({ length: 20 }, (_, i) => ({
                                                id: Date.now() + i,
                                                left: Math.random() * 100,
                                                delay: Math.random() * 1000
                                            }));
                                            setFallingHearts(prev => [...prev, ...newHearts]);

                                            // Remove hearts after animation
                                            setTimeout(() => {
                                                setFallingHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id)));
                                            }, 4000);
                                        }}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.10)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            transform: heartAnimation ? 'scale(1.3)' : 'scale(1)',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '24px',
                                            color: isLiked ? '#FFB6C1' : '#FFFFFF',
                                            transition: 'color 0.3s',
                                        }}>
                                            {isLiked ? '♥' : '♡'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Falling hearts animation */}
                            {fallingHearts.map(heart => (
                                <div
                                    key={heart.id}
                                    style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        left: `${heart.left}%`,
                                        fontSize: '16px',
                                        color: '#FFB6C1',
                                        animation: `fall 3s linear ${heart.delay}ms forwards`,
                                        pointerEvents: 'none',
                                        zIndex: 1000,
                                    }}
                                >
                                    ♥
                                </div>
                            ))}
                        </div>

                        {/* Desktop Edit Panel */}
                        {mode === 'edit' && !isMobile && (
                            <div style={{ position: 'absolute', top: '16px', right: '16px', width: '280px', maxHeight: 'calc(100% - 32px)', backgroundColor: 'rgba(225, 215, 200, 0.85)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '14px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 50 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <h2 style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', color: 'rgba(139, 115, 85, 1)', margin: 0 }}>Edit Panel</h2>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '30px', padding: '4px', color: 'rgba(139, 115, 85, 1)', lineHeight: '1' }}>⌕</button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '26px', padding: '4px', color: 'rgba(139, 115, 85, 1)', lineHeight: '1' }}>×</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {ASSETS.map((asset) => (
                                        <div
                                            key={asset.id}
                                            onClick={() => handleAssetClick(asset)}
                                            style={{ aspectRatio: '1', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(240, 240, 240, 0.5)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            <img src={asset.imageUrl} alt={asset.name} style={{ width: '70%', height: '70%', objectFit: 'contain' }} draggable={false} />
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 'auto', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#666' }}>
                                    <p style={{ margin: '2px 0' }}>• Click asset to add</p>
                                    <p style={{ margin: '2px 0' }}>• Drag to move</p>
                                    <p style={{ margin: '2px 0' }}>• Press <strong>R</strong> to flip</p>
                                    <p style={{ margin: '2px 0' }}>• Drag to 🗑️ to delete</p>
                                </div>
                            </div>
                        )}
                    </main>
                )
            }

            {/* Mobile Bottom Sheet */}
            {
                mode === 'edit' && isMobile && (
                    <>
                        {!isBottomSheetOpen && (
                            <button onClick={() => setIsBottomSheetOpen(true)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', border: 'none', borderRadius: '16px 16px 0 0', padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                                <div style={{ width: '40px', height: '4px', backgroundColor: '#CCC', borderRadius: '2px' }} />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Thing Library</span>
                            </button>
                        )}

                        {isBottomSheetOpen && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${bottomSheetHeight}vh`, backgroundColor: '#FFF', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', transition: isResizingSheet ? 'none' : 'height 0.2s ease' }}>
                                <div onMouseDown={() => setIsResizingSheet(true)} onTouchStart={() => setIsResizingSheet(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px', cursor: 'ns-resize' }}>
                                    <div style={{ width: '50px', height: '5px', backgroundColor: '#AAA', borderRadius: '3px', marginBottom: '4px' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Thing Library</h3>
                                        <button onClick={() => setIsBottomSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
                                    </div>
                                </div>
                                <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                                        {ASSETS.map((asset) => (
                                            <div key={asset.id} onClick={() => handleAssetClick(asset)} style={{ aspectRatio: '1', backgroundColor: '#F5F5F5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', cursor: 'pointer', border: '1px solid #DDD' }}>
                                                <img src={asset.imageUrl} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {/* Submission Confirmation Modal */}
            {
                showSubmitModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                    }}>
                        <div style={{
                            backgroundColor: '#1E1E23',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '90%',
                            textAlign: 'center',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}>
                            {/* Success icon */}
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#10B981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                fontSize: '32px',
                            }}>
                                ✓
                            </div>

                            <h2 style={{
                                color: '#FFFFFF',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                margin: '0 0 12px',
                            }}>
                                {wasUpdate ? 'Design Updated!' : 'Design Submitted!'}
                            </h2>

                            <p style={{
                                color: '#9CA3AF',
                                fontSize: '14px',
                                margin: '0 0 28px',
                                lineHeight: '1.5',
                            }}>
                                {wasUpdate
                                    ? 'Your room design has been updated in the gallery. Check it out to see your changes!'
                                    : 'Your room design has been submitted to the gallery. Others can now view and vote on your creation!'
                                }
                            </p>

                            {/* Action buttons */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}>
                                <button
                                    onClick={() => {
                                        setShowSubmitModal(false);
                                        goToGallery();
                                    }}
                                    style={{
                                        padding: '14px 24px',
                                        backgroundColor: '#4A90D9',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3A7BC8'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A90D9'}
                                >
                                    View Gallery
                                </button>

                                <button
                                    onClick={() => {
                                        setShowSubmitModal(false);
                                        setMode('edit');
                                    }}
                                    style={{
                                        padding: '14px 24px',
                                        backgroundColor: 'transparent',
                                        color: '#9CA3AF',
                                        border: '1px solid #4B5563',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#6B7280';
                                        e.currentTarget.style.color = '#FFFFFF';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#4B5563';
                                        e.currentTarget.style.color = '#9CA3AF';
                                    }}
                                >
                                    Continue Editing
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
