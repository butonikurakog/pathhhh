import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize, Minimize, Map as MapIcon, List, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { selectedSpots, categoryColors, toSentenceCase } from '../data/selectedTouristSpots';
import PlaceDetailsSidebar from './PlaceDetailsSidebar';

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const DEFAULT_ZOOM = 9;
const SIDEBAR_WIDTH = 480; // Increased from 420 to eliminate gap

// Platform configuration
const PLATFORMS = {
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    textColor: '#FFFFFF'
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    textColor: '#FFFFFF'
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    textColor: '#FFFFFF'
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    textColor: '#FFFFFF'
  }
};

// Helper function to get asset paths - SIMPLIFIED STRUCTURE: src/assets/Binurong_Point/Binurong_Point1.jpg
const getAssetPath = (spotName, filename) => {
  // Convert spot name to folder name (replace spaces with underscores)
  const folderName = spotName.replace(/ /g, '_');
  return `/src/assets/${folderName}/${filename}`;
};

// Loading Skeleton Component
const VideoSkeleton = () => (
  <div
    style={{
      width: '267px',
      height: '476px',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Shimmer effect */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        animation: 'shimmer 2s infinite'
      }}
    />
    {/* Loading icon */}
    <div
      style={{
        width: '48px',
        height: '48px',
        border: '4px solid rgba(255,255,255,0.1)',
        borderTopColor: '#84cc16',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
    <style>
      {`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// Performance Monitor Component
const PerformanceMonitor = ({ show }) => {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    if (!show) return;

    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;

        // Measure memory if available
        if (performance.memory) {
          const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
          setMemory(usedMB);
        }
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, [show]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#84cc16',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 10002,
        minWidth: '150px',
        border: '1px solid rgba(132, 204, 22, 0.3)'
      }}
    >
      <div style={{ marginBottom: '4px', fontWeight: 'bold', color: 'white' }}>Performance</div>
      <div>FPS: <span style={{ color: fps < 30 ? '#ef4444' : fps < 50 ? '#f59e0b' : '#84cc16' }}>{fps}</span></div>
      {memory > 0 && <div>Memory: {memory} MB</div>}
    </div>
  );
};

const MapView = memo(function MapView({ isFullscreen = false, onToggleFullscreen }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const savedState = useRef({ center: [124.2, 13.8], zoom: DEFAULT_ZOOM });
  const resizeTimeout = useRef(null);
  const animationTimeout = useRef(null);
  const previousZoom = useRef(DEFAULT_ZOOM);
  const [activeView, setActiveView] = useState('map');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [touristSpots, setTouristSpots] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [modalSpot, setModalSpot] = useState(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPlace, setSidebarPlace] = useState(null);

  // Video optimization states
  const [loadedVideos, setLoadedVideos] = useState(new Set([0])); // Start with first video
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = useRef([]);
  const iframeRefs = useRef([]);
  const observerRef = useRef(null);

  // Performance monitoring
  const [showPerformance, setShowPerformance] = useState(false);

  // Toggle performance monitor with Ctrl+Shift+P
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShowPerformance(prev => !prev);
        console.log('Performance monitor toggled');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Video queue system: Keep only current, previous, and next videos loaded
  const updateVideoQueue = useCallback((centerIndex) => {
    const videoCount = 3; // We have 3 test videos
    const newQueue = new Set();

    // Add current video
    newQueue.add(centerIndex);

    // Add previous video if exists
    if (centerIndex > 0) {
      newQueue.add(centerIndex - 1);
    }

    // Add next video if exists
    if (centerIndex < videoCount - 1) {
      newQueue.add(centerIndex + 1);
    }

    setLoadedVideos(newQueue);
    setCurrentVideoIndex(centerIndex);

    console.log('📹 Video Queue Update:', {
      current: centerIndex,
      loaded: Array.from(newQueue),
      unloaded: Array.from({ length: videoCount }, (_, i) => i).filter(i => !newQueue.has(i))
    });
  }, []);

  // Intersection Observer for lazy loading AND autoplay/pause
  useEffect(() => {
    if (!modalOpen) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.videoIndex);
          const iframe = iframeRefs.current[index];
          
          if (entry.isIntersecting) {
            console.log(`👁️ Video ${index} is now visible - Playing`);
            updateVideoQueue(index);
            
            // Autoplay when video comes into view
            if (iframe) {
              const platform = getVideoPlatform(index);
              if (platform === 'youtube') {
                // Send play command to YouTube iframe
                iframe.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                  '*'
                );
              } else if (platform === 'facebook') {
                // Facebook autoplay is handled by URL parameter
                console.log('📸 Facebook video autoplaying');
              }
            }
          } else {
            console.log(`👁️ Video ${index} left view - Pausing`);
            
            // Pause when video leaves view
            if (iframe) {
              const platform = getVideoPlatform(index);
              if (platform === 'youtube') {
                // Send pause command to YouTube iframe
                iframe.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
                  '*'
                );
              }
            }
          }
        });
      },
      {
        root: null,
        threshold: 0.5, // Trigger when 50% visible
        rootMargin: '0px'
      }
    );

    // Observe all video containers
    videoRefs.current.forEach((ref) => {
      if (ref) observerRef.current.observe(ref);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [modalOpen, updateVideoQueue]);

  // Log performance metrics
  useEffect(() => {
    if (!modalOpen) return;

    const logPerformance = setInterval(() => {
      if (performance.memory) {
        console.log('💾 Memory:', {
          used: `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`,
          total: `${Math.round(performance.memory.totalJSHeapSize / 1048576)} MB`,
          limit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)} MB`
        });
      }
    }, 5000); // Log every 5 seconds

    return () => clearInterval(logPerformance);
  }, [modalOpen]);

  // Load GeoJSON data and extract selected spots
  useEffect(() => {
    const loadTouristSpots = async () => {
      console.log('Starting to load tourist spots...');
      const spots = [];
      
      for (const selection of selectedSpots) {
        try {
          console.log(`Loading ${selection.geojsonFile}...`);
          const response = await fetch(`/data/${selection.geojsonFile}`);
          
          if (!response.ok) {
            console.error(`Failed to fetch ${selection.geojsonFile}: ${response.status}`);
            continue;
          }
          
          const geojson = await response.json();
          
          // Find the specific spot by name
          const feature = geojson.features.find(
            f => f.properties.name === selection.spotName
          );
          
          if (feature) {
            // Add images for Binurong Point using new simplified folder structure
            let images = [];
            if (feature.properties.name === 'Binurong Point') {
              images = [
                getAssetPath('Binurong Point', 'Binurong_Point1.jpg'),
                getAssetPath('Binurong Point', 'Binurong_Point2.jpg')
              ];
            }
            
            spots.push({
              name: feature.properties.name,
              location: toSentenceCase(feature.properties.municipality),
              coordinates: feature.geometry.coordinates,
              description: feature.properties.description,
              categories: feature.properties.categories || [],
              images: images
            });
            console.log(`✓ Found: ${feature.properties.name}`);
          } else {
            console.error(`✗ Spot "${selection.spotName}" not found in ${selection.geojsonFile}`);
            console.log('Available spots:', geojson.features.map(f => f.properties.name));
          }
        } catch (error) {
          console.error(`Error loading ${selection.geojsonFile}:`, error);
        }
      }
      
      console.log(`Loaded ${spots.length}/${selectedSpots.length} tourist spots`);
      setTouristSpots(spots);
      setDataLoaded(true);
    };

    loadTouristSpots();
  }, []);

  // Add to itinerary handler
  const addToItinerary = (spot) => {
    const isAlreadyAdded = itinerary.some(item => item.name === spot.name);
    
    if (!isAlreadyAdded) {
      setItinerary(prev => [...prev, spot]);
      console.log('Added to itinerary:', spot.name);
    } else {
      console.log('Already in itinerary:', spot.name);
    }
  };

  // Handle image click to open modal - opens sidebar automatically
  const handleImageClick = (image, spot) => {
    setModalImage(image);
    setModalSpot(spot);
    setModalOpen(true);
    // Open sidebar when modal opens
    setSidebarPlace(spot);
    setSidebarOpen(true);
    // Reset to first video when opening modal
    setLoadedVideos(new Set([0]));
    setCurrentVideoIndex(0);
  };

  // Close modal - also closes sidebar
  const closeModal = () => {
    setModalOpen(false);
    setSidebarOpen(false);
    // Pause all videos when closing
    iframeRefs.current.forEach((iframe, index) => {
      if (iframe) {
        const platform = getVideoPlatform(index);
        if (platform === 'youtube') {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
            '*'
          );
        }
      }
    });
    setTimeout(() => {
      setModalImage(null);
      setModalSpot(null);
      setSidebarPlace(null);
      setLoadedVideos(new Set([0]));
      setCurrentVideoIndex(0);
    }, 300);
  };

  // Close sidebar handler
  const closeSidebar = () => {
    setSidebarOpen(false);
    setTimeout(() => {
      setSidebarPlace(null);
    }, 300);
  };

  // Calculate marker scale based on zoom level
  const getMarkerScale = (zoom) => {
    const baseZoom = 9;
    const scale = Math.max(0.5, 1 - (zoom - baseZoom) * 0.1);
    return scale;
  };

  // Update marker sizes based on zoom
  const updateMarkerSizes = useCallback((zoom) => {
    const scale = getMarkerScale(zoom);
    markersRef.current.forEach(marker => {
      const element = marker.getElement();
      const icon = element?.querySelector('i');
      if (icon) {
        icon.style.fontSize = `${42 * scale}px`;
      }
    });
  }, []);

  // Get category pill HTML
  const getCategoryPill = (category) => {
    const colors = categoryColors[category] || categoryColors.default;
    return `
      <span style="
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        background-color: ${colors.bg};
        color: ${colors.text};
        font-size: 10px;
        font-weight: 600;
        text-transform: capitalize;
        margin-right: 4px;
        margin-bottom: 4px;
      ">${category.toLowerCase().replace('_', ' ')}</span>
    `;
  };

  // Create info card HTML content with image carousel
  const createInfoCardHTML = (spot) => {
    const categoryHTML = spot.categories
      .slice(0, 2)
      .map(cat => getCategoryPill(cat))
      .join('');

    // Create carousel HTML if images exist
    const hasImages = spot.images && spot.images.length > 0;
    const carouselHTML = hasImages ? `
      <div id="carousel-container" style="
        width: 100%;
        height: 210px;
        background-color: #e5e7eb;
        position: relative;
        overflow: hidden;
      ">
        ${spot.images.map((img, idx) => `
          <img 
            src="${img}" 
            alt="${spot.name} ${idx + 1}"
            class="carousel-image"
            data-index="${idx}"
            data-image-url="${img}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              position: absolute;
              top: 0;
              left: 0;
              opacity: ${idx === 0 ? '1' : '0'};
              transition: opacity 0.3s ease;
              cursor: pointer;
            "
          />
        `).join('')}
        
        ${spot.images.length > 1 ? `
          <!-- Previous Button -->
          <button id="carousel-prev-btn" style="
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s;
            z-index: 10;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <!-- Next Button -->
          <button id="carousel-next-btn" style="
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s;
            z-index: 10;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <!-- Image Counter -->
          <div id="image-counter" style="
            position: absolute;
            bottom: 8px;
            right: 8px;
            padding: 4px 8px;
            border-radius: 12px;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            font-size: 11px;
            font-weight: 600;
            z-index: 10;
          ">1 / ${spot.images.length}</div>
        ` : ''}
      </div>
    ` : `
      <div style="
        width: 100%;
        height: 210px;
        background-color: #e5e7eb;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="fa-solid fa-location-dot" style="font-size: 48px; color: #9ca3af;"></i>
      </div>
    `;

    return `
      <div style="
        width: 280px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      ">
        <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 10;">
          <button id="add-to-itinerary-btn" class="add-itinerary-btn" style="
            height: 28px;
            min-width: 28px;
            border-radius: 14px;
            background-color: rgba(132, 204, 22, 0.9);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            white-space: nowrap;
            padding: 0 10px;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span class="btn-text" style="
              max-width: 0;
              opacity: 0;
              margin-left: 0;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              font-size: 11px;
              font-weight: 600;
              color: white;
            ">Add to Itinerary</span>
          </button>

          <button id="close-card-btn" style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        ${carouselHTML}

        <div style="padding: 12px 14px; background-color: white;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <i class="fa-solid fa-location-dot fa-bounce" style="font-size: 12px; color: #6b7280;"></i>
            <span style="color: #6b7280; font-size: 11px; font-weight: 500;">${spot.location}</span>
          </div>

          <h3 style="
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${spot.name}</h3>

          <div style="display: flex; flex-wrap: wrap; gap: 0;">
            ${categoryHTML}
          </div>
        </div>
      </div>

      <style>
        .add-itinerary-btn:hover {
          background-color: rgba(132, 204, 22, 1) !important;
          min-width: 140px !important;
        }
        .add-itinerary-btn:hover .btn-text {
          max-width: 120px !important;
          opacity: 1 !important;
          margin-left: 6px !important;
        }
      </style>
    `;
  };

  // Add tourist spot markers - improved with better state checking
  const addTouristSpotMarkers = useCallback(() => {
    // Check if we have everything we need
    if (!map.current || !mapLoaded.current || touristSpots.length === 0) {
      console.log('⏳ Waiting for prerequisites:', {
        hasMap: !!map.current,
        mapLoaded: mapLoaded.current,
        spotsCount: touristSpots.length
      });
      return;
    }

    console.log(`🗺️ Adding ${touristSpots.length} markers to map...`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const currentZoom = map.current.getZoom();
    const scale = getMarkerScale(currentZoom);

    // Add markers for each tourist spot
    touristSpots.forEach((spot, index) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker';
      markerEl.innerHTML = `
        <i class="fa-solid fa-location-dot" style="
          font-size: ${42 * scale}px;
          color: #84cc16;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
          cursor: pointer;
          transition: font-size 0.3s ease, transform 0.2s ease;
        "></i>
      `;
      
      const iconElement = markerEl.querySelector('i');
      
      markerEl.addEventListener('mouseenter', () => {
        iconElement.classList.add('fa-bounce');
        iconElement.style.transform = 'scale(1.15)';
      });
      markerEl.addEventListener('mouseleave', () => {
        iconElement.classList.remove('fa-bounce');
        iconElement.style.transform = 'scale(1)';
      });

      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: 'bottom'
      })
        .setLngLat(spot.coordinates)
        .addTo(map.current);

      markerEl.addEventListener('click', () => {
        iconElement.classList.add('fa-bounce');
        setTimeout(() => iconElement.classList.remove('fa-bounce'), 1000);

        setSelectedSpot(spot);
        
        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popup = new maplibregl.Popup({
          offset: [0, -342],
          closeButton: false,
          closeOnClick: false,
          className: 'tourist-spot-popup',
          maxWidth: 'none'
        })
          .setLngLat(spot.coordinates)
          .setHTML(createInfoCardHTML(spot))
          .addTo(map.current);

        popupRef.current = popup;

        // Setup carousel and button listeners after popup is added
        setTimeout(() => {
          let currentIdx = 0;
          const images = document.querySelectorAll('.carousel-image');
          const totalImages = images.length;
          const counter = document.getElementById('image-counter');
          const prevBtn = document.getElementById('carousel-prev-btn');
          const nextBtn = document.getElementById('carousel-next-btn');

          function showImage(index) {
            images.forEach((img, i) => {
              img.style.opacity = i === index ? '1' : '0';
            });
            if (counter) {
              counter.textContent = `${index + 1} / ${totalImages}`;
            }
          }

          // Add click handlers to images
          images.forEach((img) => {
            img.addEventListener('click', (e) => {
              const imageUrl = e.target.getAttribute('data-image-url');
              handleImageClick(imageUrl, spot);
            });
          });

          if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              currentIdx = (currentIdx - 1 + totalImages) % totalImages;
              showImage(currentIdx);
            });
            prevBtn.addEventListener('mouseenter', () => {
              prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            });
            prevBtn.addEventListener('mouseleave', () => {
              prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            });
          }

          if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              currentIdx = (currentIdx + 1) % totalImages;
              showImage(currentIdx);
            });
            nextBtn.addEventListener('mouseenter', () => {
              nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            });
            nextBtn.addEventListener('mouseleave', () => {
              nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            });
          }

          const closeBtn = document.getElementById('close-card-btn');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
              }
              setSelectedSpot(null);
            });
            
            closeBtn.addEventListener('mouseenter', () => {
              closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            });
            closeBtn.addEventListener('mouseleave', () => {
              closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            });
          }

          const addBtn = document.getElementById('add-to-itinerary-btn');
          if (addBtn) {
            addBtn.addEventListener('click', () => addToItinerary(spot));
          }
        }, 0);
        
        const targetZoom = Math.max(map.current.getZoom(), 12);
        
        map.current.flyTo({
          center: spot.coordinates,
          zoom: targetZoom,
          padding: { top: 300, bottom: 50, left: 0, right: 0 },
          duration: 800
        });
      });

      markersRef.current.push(marker);
      console.log(`✓ Marker ${index + 1}: ${spot.name}`);
    });

    console.log(`✅ Successfully added ${markersRef.current.length} markers!`);
  }, [touristSpots]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    fontAwesomeLink.integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==';
    fontAwesomeLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontAwesomeLink);

    const bounds = [
      [123.5, 12.8],
      [125.0, 14.8]
    ];

    console.log('🌍 Initializing map...');

    fetch(`https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_API_KEY}`)
      .then(response => response.json())
      .then(style => {
        style.layers = style.layers.map(layer => {
          if (layer.id && (
            layer.id.includes('place') || 
            layer.id.includes('town') || 
            layer.id.includes('city') ||
            layer.id.includes('village')
          ) && layer.type === 'symbol') {
            return {
              ...layer,
              minzoom: Math.min(layer.minzoom || 14, 9)
            };
          }
          return layer;
        });

        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: style,
          center: [124.2, 13.8],
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
          maxBounds: bounds,
          antialias: false,
          preserveDrawingBuffer: false,
          fadeDuration: 0,
          maxParallelImageRequests: 4, // Reduced from 8 for Raspberry Pi
          refreshExpiredTiles: false,
          trackResize: true,
          maxZoom: 18,
          maxPitch: 60,
        });

        map.current.on('zoom', () => {
          const currentZoom = map.current.getZoom();
          updateMarkerSizes(currentZoom);
        });

        map.current.on('load', () => {
          console.log('✅ Map loaded successfully');
          mapLoaded.current = true;
          
          const maskGeoJSON = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-180, -90],
                  [180, -90],
                  [180, 90],
                  [-180, 90],
                  [-180, -90]
                ],
                [
                  [124.011, 13.35],
                  [124.011, 14.15],
                  [124.45, 14.15],
                  [124.45, 13.35],
                  [124.011, 13.35]
                ]
              ]
            }
          };

          // Check if source already exists before adding
          if (!map.current.getSource('mask')) {
            map.current.addSource('mask', {
              type: 'geojson',
              data: maskGeoJSON
            });

            map.current.addLayer({
              id: 'mask-layer',
              type: 'fill',
              source: 'mask',
              paint: {
                'fill-color': '#000000',
                'fill-opacity': 1
              }
            });
          }

          // Try to add markers if data is already loaded
          if (dataLoaded && touristSpots.length > 0) {
            console.log('🎯 Data already loaded, adding markers immediately');
            addTouristSpotMarkers();
          }
        });
      })
      .catch(error => {
        console.error('❌ Error loading map style:', error);
      });

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
        mapLoaded.current = false;
      }
    };
  }, [updateMarkerSizes, dataLoaded, touristSpots, addTouristSpotMarkers]);

  // CRITICAL: Add markers when BOTH map is ready AND tourist spots are loaded
  useEffect(() => {
    if (mapLoaded.current && dataLoaded && touristSpots.length > 0) {
      console.log('🎯 Both map and data ready, adding markers...');
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        addTouristSpotMarkers();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [dataLoaded, touristSpots, addTouristSpotMarkers]);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (!map.current) return;
    
    const currentZoom = map.current.getZoom();
    const currentCenter = map.current.getCenter();
    
    savedState.current = {
      center: currentCenter,
      zoom: currentZoom
    };

    if (resizeTimeout.current) {
      clearTimeout(resizeTimeout.current);
    }

    resizeTimeout.current = setTimeout(() => {
      if (map.current) {
        map.current.resize();
        
        let targetZoom = savedState.current.zoom;
        
        if (Math.abs(previousZoom.current - DEFAULT_ZOOM) < 0.01) {
          targetZoom = DEFAULT_ZOOM;
        }
        
        map.current.jumpTo({
          center: savedState.current.center,
          zoom: targetZoom
        });
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (map.current) {
      previousZoom.current = map.current.getZoom();
    }

    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
    }

    animationTimeout.current = setTimeout(() => {
      handleResize();
    }, 750);

    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, [isFullscreen, handleResize]);

  const handleToggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    }
  }, [onToggleFullscreen]);

  // Get platform for video based on index
  const getVideoPlatform = (index) => {
    if (index === 1) return 'youtube';
    return 'facebook';
  };

  // Video card component with lazy loading
  const VideoCard = ({ index, isLoaded }) => {
    const platform = getVideoPlatform(index);
    const platformConfig = PLATFORMS[platform];
    const isLandscape = platform === 'youtube';

    return (
      <div
        ref={(el) => (videoRefs.current[index] = el)}
        data-video-index={index}
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always'
        }}
      >
        <div
          style={{
            width: isLandscape ? '500px' : '300px',
            height: '85vh',
            maxHeight: isLandscape ? '400px' : '600px',
            backgroundColor: '#000000',
            borderRadius: '16px',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000'
            }}
          >
            {!isLoaded ? (
              <VideoSkeleton />
            ) : platform === 'youtube' ? (
              // YouTube embed (landscape)
              <iframe 
                ref={(el) => (iframeRefs.current[index] = el)}
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/j6IsY1PR5XE?si=9HeiBBjuU3Y_O63y&enablejsapi=1&autoplay=1&mute=1" 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen
                style={{
                  border: 'none',
                  borderRadius: '16px',
                  opacity: 0,
                  animation: 'fadeIn 0.5s ease-in forwards'
                }}
              />
            ) : (
              // Facebook video (portrait)
              <iframe 
                ref={(el) => (iframeRefs.current[index] = el)}
                src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F3233230416819996%2F&show_text=false&width=267&t=0&autoplay=true" 
                width="267" 
                height="476" 
                style={{
                  border: 'none',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  opacity: 0,
                  animation: 'fadeIn 0.5s ease-in forwards'
                }}
                scrolling="no" 
                frameBorder="0" 
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            )}
          </div>
          
          {/* Minimal overlay with just location and platform pill */}
          {modalSpot && isLoaded && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '12px',
                zIndex: 10
              }}
            >
              {/* Location text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {modalSpot.location}
                </p>
              </div>

              {/* Platform pill */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: platformConfig.color,
                  color: platformConfig.textColor,
                  fontSize: '12px',
                  fontWeight: '600',
                  textShadow: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  flexShrink: 0,
                  letterSpacing: '0.3px'
                }}
              >
                {platformConfig.name}
              </div>
            </div>
          )}
        </div>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
        </style>
      </div>
    );
  };

  // Modal content component - Videos centered within left container area
  const ModalContent = () => {
    // Calculate available width for video container when sidebar is open
    const videoContainerWidth = sidebarOpen 
      ? `calc(100vw - ${SIDEBAR_WIDTH}px)` 
      : '100vw';

    return (
      <div
        onClick={closeModal}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9998, // Below sidebar (9999)
          display: 'flex',
          flexDirection: 'row',
          opacity: modalOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Performance Monitor */}
        <PerformanceMonitor show={showPerformance} />

        {/* Video container - width adjusts, videos centered within this container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: videoContainerWidth,
            height: '100vh',
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            transition: 'width 0.3s ease',
            // Hide scrollbar
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none' // IE and Edge
          }}
          className="video-scroll-container"
        >
          {/* Render 3 video cards with lazy loading */}
          {[0, 1, 2].map((index) => (
            <VideoCard 
              key={index} 
              index={index} 
              isLoaded={loadedVideos.has(index)}
            />
          ))}
        </div>

        {/* Spacer for sidebar - only visible when sidebar is open */}
        {sidebarOpen && (
          <div
            style={{
              width: `${SIDEBAR_WIDTH}px`,
              height: '100vh',
              flexShrink: 0,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Debug info (only visible when performance monitor is on) */}
        {showPerformance && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              zIndex: 10002,
              border: '1px solid rgba(132, 204, 22, 0.3)'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#84cc16' }}>Video Queue</div>
            <div>Current: {currentVideoIndex}</div>
            <div>Loaded: [{Array.from(loadedVideos).join(', ')}]</div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>Press Ctrl+Shift+P to toggle</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    >
      {/* Modal rendered via Portal to document.body - ensures it appears above everything */}
      {modalOpen && createPortal(<ModalContent />, document.body)}

      {/* PlaceDetailsSidebar rendered via Portal */}
      {createPortal(
        <PlaceDetailsSidebar 
          place={sidebarPlace} 
          isOpen={sidebarOpen} 
          onClose={closeSidebar} 
        />,
        document.body
      )}

      {activeView === 'map' && (
        <button
          onClick={handleToggleFullscreen}
          style={{
            position: 'absolute',
            top: isFullscreen ? '12px' : '12px',
            left: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            backgroundColor: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.5s ease-in-out',
            willChange: 'top, left, background-color'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          {isFullscreen ? (
            <Minimize color="black" size={18} strokeWidth={2} />
          ) : (
            <Maximize color="black" size={18} strokeWidth={2} />
          )}
        </button>
      )}

      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          display: 'flex',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '3px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          gap: '3px'
        }}
      >
        <button
          onClick={() => setActiveView('map')}
          style={{
            position: 'relative',
            padding: '6px 10px',
            border: 'none',
            borderRadius: '13px',
            backgroundColor: activeView === 'map' ? '#1f2937' : 'transparent',
            color: activeView === 'map' ? 'white' : '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MapIcon size={16} strokeWidth={2} />
        </button>

        <button
          onClick={() => setActiveView('itinerary')}
          style={{
            position: 'relative',
            padding: '6px 10px',
            border: 'none',
            borderRadius: '13px',
            backgroundColor: activeView === 'itinerary' ? '#1f2937' : 'transparent',
            color: activeView === 'itinerary' ? 'white' : '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <List size={16} strokeWidth={2} />
        </button>
      </div>

      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          display: activeView === 'map' ? 'block' : 'none'
        }} 
      />

      {activeView === 'itinerary' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: isFullscreen ? '16px' : '16px',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: '600',
            padding: '20px'
          }}
        >
          <div>Itinerary View</div>
          {itinerary.length > 0 && (
            <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: '400' }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>Items in itinerary: {itinerary.length}</div>
              {itinerary.map((item, index) => (
                <div key={index} style={{ padding: '5px 0' }}>• {item.name}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>
        {`
          .maplibregl-popup-content {
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .maplibregl-popup-tip {
            display: none !important;
          }
          .tourist-spot-popup .maplibregl-popup-content {
            border-radius: 12px;
          }
          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          /* Hide scrollbar for Chrome, Safari and Opera */
          .video-scroll-container::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
});

export default MapView;