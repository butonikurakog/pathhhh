import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Menu, X, ChevronDown, Calendar } from 'lucide-react';
import FloatingCard from '../components/FloatingCard';
import MapView from '../components/MapView';
import ChatBot from '../components/ChatBot';
import TravellerInformation from '../components/TravellerInformation';
import NetworkStatus from '../components/NetworkStatus';

export default function Explore() {
  const [isMinimized, setIsMinimized] = useState(true); // Minimized by default
  const [hasMounted, setHasMounted] = useState(false); // Track first mount
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const containerRef = useRef(null);
  const [translateValues, setTranslateValues] = useState({ x: 0, y: 0 });
  const [isPositionCalculated, setIsPositionCalculated] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Memoized calculate function to prevent recreation
  const calculateTranslateValues = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      
      // Calculate distance from bottom-right to top-left
      // Adjusted to account for button width when minimized (~160px for text + chevron)
      const translateX = -(width - 160 - 8);
      const translateY = -(height - 40 - 8);
      
      setTranslateValues({ x: translateX, y: translateY });
      setIsPositionCalculated(true);
    }
  }, []);

  // Use useLayoutEffect to calculate position before first paint
  useLayoutEffect(() => {
    calculateTranslateValues();
    // Small delay to ensure position is rendered before enabling animations
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [calculateTranslateValues]);

  // Debounced resize handler for better performance
  const handleResize = useCallback(() => {
    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce resize calculation to avoid excessive calls
    resizeTimeoutRef.current = setTimeout(() => {
      calculateTranslateValues();
    }, 150);
  }, [calculateTranslateValues]);

  useEffect(() => {
    // Add debounced resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize]);

  // Memoized toggle handlers to prevent recreation
  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const toggleMapFullscreen = useCallback(() => {
    setIsMapFullscreen(prev => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Memoize styles to prevent recreation on every render
  const containerStyle = useMemo(() => ({
    width: '90vw',
    height: '90vh',
    border: '1px solid white',
    borderRadius: '24px',
    backgroundColor: 'transparent',
    display: 'flex',
    gap: '24px',
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden'
  }), []);

  // Updated to account for 24px gap
  const leftContainerStyle = useMemo(() => ({
    width: 'calc((100% - 24px) / 2)',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  }), []);

  const leftContentStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    borderRadius: '16px',
    padding: '16px',
    boxSizing: 'border-box'
  }), []);

  const overlayContainerStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: isMinimized ? 'none' : 'auto'
  }), [isMinimized]);

  const whiteCardTransformStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transformOrigin: 'bottom right',
    transform: isMinimized 
      ? `translate(${translateValues.x}px, ${translateValues.y}px) scale(0.1)` 
      : 'translate(0, 0) scale(1)',
    // Only animate after first mount
    transition: hasMounted ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    pointerEvents: isMinimized ? 'none' : 'auto',
    willChange: 'transform'
  }), [isMinimized, translateValues.x, translateValues.y, hasMounted]);

  const whiteCardBackgroundStyle = useMemo(() => ({
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: '#434141', // Darker grey background
    borderRadius: '16px',
    padding: '16px',
    boxSizing: 'border-box',
    opacity: isMinimized ? 0 : 1,
    // Only animate after first mount
    transition: hasMounted ? 'opacity 0.4s ease' : 'none',
    willChange: 'opacity',
    overflow: 'hidden'
  }), [isMinimized, hasMounted]);

  const buttonStyle = useMemo(() => ({
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    height: '40px',
    minWidth: '40px',
    borderRadius: isMinimized ? '20px' : '50%',
    backgroundColor: '#84cc16',
    display: isPositionCalculated ? 'flex' : 'none', // Hide completely until calculated
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: isMinimized ? '0 16px 0 12px' : '0',
    cursor: 'pointer',
    transform: isMinimized 
      ? `translate(${translateValues.x}px, ${translateValues.y}px)` 
      : 'translate(0, 0)',
    // Only animate after first mount
    transition: hasMounted 
      ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-radius 0.3s ease, padding 0.3s ease'
      : 'none',
    zIndex: 20,
    pointerEvents: 'auto',
    boxShadow: isMinimized 
      ? '0 4px 20px rgba(132, 204, 22, 0.6)' 
      : '0 2px 8px rgba(0, 0, 0, 0.15)',
    willChange: 'transform, box-shadow',
    whiteSpace: 'nowrap'
  }), [isMinimized, translateValues.x, translateValues.y, hasMounted, isPositionCalculated]);

  const menuButtonStyle = useMemo(() => ({
    position: 'absolute',
    top: '1.2vh',
    left: '1.2vw',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '12px',
    backgroundColor: isSidebarOpen ? 'rgba(132, 204, 22, 0.92)' : 'rgba(31, 41, 55, 0.9)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    cursor: 'pointer',
    boxShadow: isSidebarOpen
      ? '0 12px 30px rgba(132, 204, 22, 0.35)'
      : '0 10px 28px rgba(0, 0, 0, 0.35)',
    transform: isSidebarOpen ? 'translateY(2px)' : 'translateY(0)',
    transition: 'all 0.3s ease',
    zIndex: 40,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  }), [isSidebarOpen]);

  const menuButtonLabelStyle = useMemo(() => ({
    fontWeight: 700,
    letterSpacing: '0.02em',
    fontSize: '14px'
  }), []);

  const sidebarStyle = useMemo(() => ({
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '260px',
    padding: '20px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    color: 'white',
    transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-110%)',
    transition: 'transform 0.35s ease, box-shadow 0.35s ease',
    boxShadow: isSidebarOpen ? '8px 0 30px rgba(0, 0, 0, 0.35)' : 'none',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 35,
    pointerEvents: isSidebarOpen ? 'auto' : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }), [isSidebarOpen]);

  const sidebarOverlayStyle = useMemo(() => ({
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    opacity: isSidebarOpen ? 1 : 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: isSidebarOpen ? 'auto' : 'none',
    zIndex: 30,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)'
  }), [isSidebarOpen]);

  // Icon container style with crossfade animation
  const iconContainerStyle = useMemo(() => ({
    position: 'relative',
    width: '20px',
    height: '20px',
    flexShrink: 0
  }), []);

  // Calendar icon style - visible when minimized
  const calendarIconStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: isMinimized ? 1 : 0,
    transform: isMinimized ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(90deg)',
    transition: hasMounted ? 'opacity 0.4s ease, transform 0.4s ease' : 'none',
    willChange: 'opacity, transform'
  }), [isMinimized, hasMounted]);

  // Chevron icon style - visible when expanded
  const chevronIconStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: isMinimized ? 0 : 1,
    transform: isMinimized ? 'scale(0.5) rotate(-90deg)' : 'scale(1) rotate(135deg)',
    transition: hasMounted ? 'opacity 0.4s ease, transform 0.6s ease' : 'none',
    willChange: 'opacity, transform'
  }), [isMinimized, hasMounted]);

  const textStyle = useMemo(() => ({
    color: 'black',
    fontSize: '14px',
    fontWeight: '600',
    opacity: isMinimized ? 1 : 0,
    maxWidth: isMinimized ? '200px' : '0',
    overflow: 'hidden',
    transition: hasMounted ? 'opacity 0.3s ease, max-width 0.3s ease' : 'none',
    willChange: 'opacity, max-width'
  }), [isMinimized, hasMounted]);

  // Right container that holds both the white container and map overlay
  const rightContainerStyle = useMemo(() => ({
    width: 'calc((100% - 24px) / 2)',
    height: '100%',
    position: 'relative'
  }), []);

  // White container underneath the map
  const whiteUnderContainerStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '16px',
    boxSizing: 'border-box'
  }), []);

  // Map container - properly sized to cover full parent content area when fullscreen
  const mapContainerStyle = useMemo(() => ({
    position: 'absolute',
    top: isMapFullscreen ? '0' : '0',
    right: isMapFullscreen ? '0' : '0',
    bottom: isMapFullscreen ? '0' : '0',
    // When fullscreen: width = 2x child containers + gap = full parent content width
    width: isMapFullscreen ? 'calc(200% + 24px)' : '100%',
    // When fullscreen: move left by (right container width + gap)
    left: isMapFullscreen ? 'calc(-100% - 24px)' : '0',
    borderRadius: isMapFullscreen ? '16px' : '16px',
    overflow: 'hidden',
    transition: 'all 0.5s ease-in-out',
    zIndex: isMapFullscreen ? 30 : 1
  }), [isMapFullscreen]);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Sidebar overlay */}
      <div style={sidebarOverlayStyle} onClick={closeSidebar} />

      {/* Left burger menu button */}
      <button
        type="button"
        aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isSidebarOpen}
        onClick={toggleSidebar}
        style={menuButtonStyle}
      >
        {isSidebarOpen ? (
          <X size={20} strokeWidth={3} />
        ) : (
          <Menu size={20} strokeWidth={3} />
        )}
        <span style={menuButtonLabelStyle}>Menu</span>
      </button>

      {/* Slim sidebar content */}
      <div style={sidebarStyle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-300/80">Pathfinder</p>
            <h2 className="text-lg font-semibold">Quick Access</h2>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-left hover:border-lime-400/40 hover:bg-lime-400/10 transition"
            onClick={() => {
              closeSidebar();
              if (!isMapFullscreen) {
                toggleMapFullscreen();
              }
            }}
          >
            <span className="text-sm font-semibold">Map Overview</span>
            <span className="text-xs text-gray-300">Jump to fullscreen map</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-left hover:border-lime-400/40 hover:bg-lime-400/10 transition"
            onClick={() => {
              closeSidebar();
              if (isMinimized) {
                toggleMinimize();
              }
            }}
          >
            <span className="text-sm font-semibold">Resume Itinerary</span>
            <span className="text-xs text-gray-300">Open trip planner</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-left hover:border-lime-400/40 hover:bg-lime-400/10 transition"
            onClick={closeSidebar}
          >
            <span className="text-sm font-semibold">Traveler Notes</span>
            <span className="text-xs text-gray-300">Save ideas and reminders</span>
          </button>
        </div>

        <div className="mt-auto p-3 rounded-xl border border-white/5 bg-white/5">
          <p className="text-xs text-gray-300/90 mb-1">Status</p>
          <p className="text-sm font-semibold text-lime-200">All systems active</p>
          <p className="text-xs text-gray-300/80">Stay curious, traveler.</p>
        </div>
      </div>

      {/* Network status - top right */}
      <div className="absolute z-20" style={{ top: '1.2vh', right: '1.2vw' }}>
        <NetworkStatus />
      </div>
      
      {/* Centered container for FloatingCard */}
      <div className="w-full h-full flex items-center justify-center">
        <div style={containerStyle}>
          {/* Left container with ChatBot in black background */}
          <div style={leftContainerStyle}>
            <div style={leftContentStyle}>
              <ChatBot />
            </div>
            
            {/* Overlay for grey card with TravellerInformation */}
            <div ref={containerRef} style={overlayContainerStyle}>
              {/* Grey card that shrinks following button path */}
              <div style={whiteCardTransformStyle}>
                {/* Grey card background with TravellerInformation */}
                <div style={whiteCardBackgroundStyle}>
                  <TravellerInformation />
                </div>
              </div>

              {/* Green button with icon transition and text */}
              <div onClick={toggleMinimize} style={buttonStyle}>
                {/* Icon container with crossfade animation */}
                <div style={iconContainerStyle}>
                  {/* Calendar icon - visible when minimized */}
                  <div style={calendarIconStyle}>
                    <Calendar 
                      color="black" 
                      size={20} 
                      strokeWidth={3}
                    />
                  </div>
                  {/* Chevron icon - visible when expanded */}
                  <div style={chevronIconStyle}>
                    <ChevronDown 
                      color="black" 
                      size={20} 
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <span style={textStyle}>Create Itinerary</span>
              </div>
            </div>
          </div>
          
          {/* Right container with white background underneath map */}
          <div style={rightContainerStyle}>
            {/* White container underneath */}
            <div style={whiteUnderContainerStyle}>
              {/* Your content goes here */}
            </div>
            
            {/* Map container - covers full parent width when fullscreen */}
            <div style={mapContainerStyle}>
              <MapView 
                isFullscreen={isMapFullscreen}
                onToggleFullscreen={toggleMapFullscreen}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
