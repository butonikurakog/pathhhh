# Place Details Sidebar Feature

## Overview

The Place Details Sidebar is a new feature that provides detailed information about tourist spots when images are clicked in the vertical video scrolling modal. This sidebar slides in from the right side of the screen, offering a comprehensive view of place information.

## How It Works

### User Flow

1. **Click on a marker** on the map to open a tourist spot info card
2. **Click on an image** in the info card carousel
3. **Vertical scrolling modal opens** with video content
4. **Sidebar automatically slides in from the right** with detailed place information

### Components

#### PlaceDetailsSidebar Component

Location: `src/components/PlaceDetailsSidebar.jsx`

**Features:**
- Smooth slide-in animation from the right
- Semi-transparent backdrop overlay
- Image gallery with navigation arrows
- Scrollable content area
- Detailed place information sections
- Action buttons (Get Directions)

**Props:**
```javascript
{
  place: Object,      // Place data object
  isOpen: Boolean,    // Controls sidebar visibility
  onClose: Function   // Callback to close sidebar
}
```

**Place Data Structure:**
```javascript
{
  name: String,           // Place name
  location: String,       // Municipality/location
  description: String,    // Detailed description
  rating: Number,         // Rating (0-5)
  reviewCount: Number,    // Number of reviews
  entranceFee: {         // Entrance fee information
    adult: String,
    student: String
  },
  hours: String,         // Operating hours
  contact: String,       // Contact information
  images: Array,         // Array of image URLs
  categories: Array      // Categories/tags
}
```

### Integration

The sidebar is integrated into the MapView component:

```javascript
// State management
const [sidebarOpen, setSidebarOpen] = useState(false);
const [sidebarPlace, setSidebarPlace] = useState(null);

// Opens sidebar when image is clicked
const handleImageClick = (image, spot) => {
  setModalImage(image);
  setModalSpot(spot);
  setModalOpen(true);
  setSidebarPlace(spot);
  setSidebarOpen(true);
};

// Render sidebar via Portal
{createPortal(
  <PlaceDetailsSidebar 
    place={sidebarPlace} 
    isOpen={sidebarOpen} 
    onClose={closeSidebar} 
  />,
  document.body
)}
```

## UI Design

### Layout

- **Width:** 420px (max 90vw on mobile)
- **Position:** Fixed on the right side
- **Z-index:** 9999 (appears above modal content)
- **Animation:** Slide from right with cubic-bezier easing

### Sections

1. **Header**
   - Close button (X icon)
   - Positioned absolutely in top-right corner

2. **Image Gallery** (320px height)
   - Full-width image display
   - Navigation arrows (if multiple images)
   - Image counter badge
   - Click to view next/previous image

3. **Place Information**
   - Location with pin icon
   - Place name (large, bold)
   - Star rating with review count
   - About section with description

4. **Details Cards**
   - Entrance Fee (with icon)
   - Operating Hours (with clock icon)
   - Contact Information (with phone icon)

5. **Action Buttons**
   - "Get Directions" button (primary, green)
   - Hover effects with elevation

### Styling Features

- **Backdrop:** Semi-transparent black with blur effect
- **Smooth animations:** 300ms cubic-bezier transitions
- **Scrollable content:** Vertical scroll for long content
- **Responsive design:** Adapts to smaller screens
- **Touch-optimized:** Works well on mobile devices

## Technical Details

### React Portals

The sidebar is rendered using React Portals to ensure it appears outside the normal component hierarchy and above all other content:

```javascript
import { createPortal } from 'react-dom';

{createPortal(
  <PlaceDetailsSidebar />,
  document.body
)}
```

### State Management

The sidebar state is managed in the MapView component:

- `sidebarOpen`: Boolean controlling visibility
- `sidebarPlace`: Object containing place data
- Automatically synced with modal state

### Performance Considerations

- Uses CSS transforms for smooth animations
- Implements `will-change` for optimized rendering
- Lazy rendering (only renders when needed)
- Clean timeout management for state cleanup

## Future Enhancements

### Planned Features

1. **Social Media Links**
   - Add Facebook, Instagram, TikTok links
   - Share buttons for social platforms

2. **User Reviews Section**
   - Display actual user reviews
   - Add review submission form

3. **Booking Integration**
   - "Book Now" button for accommodations
   - Tour booking functionality

4. **Weather Information**
   - Current weather at the location
   - Forecast for planning visits

5. **Nearby Places**
   - Show other attractions nearby
   - Quick navigation to related spots

6. **Photo Gallery Enhancement**
   - Lightbox view for full-screen images
   - Pinch-to-zoom on mobile
   - Image captions and credits

7. **Accessibility Improvements**
   - Keyboard navigation support
   - Screen reader optimization
   - ARIA labels and roles

## Usage Example

```javascript
import PlaceDetailsSidebar from './PlaceDetailsSidebar';

function MyComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const placeData = {
    name: 'Binurong Point',
    location: 'Baras, Catanduanes',
    description: 'A breathtaking viewpoint...',
    rating: 4.9,
    reviewCount: 28,
    entranceFee: { adult: '₱15.00', student: '₱10.00' },
    hours: '8:00 AM - 5:00 PM',
    contact: '+63 123 456 7890',
    images: ['image1.jpg', 'image2.jpg'],
    categories: ['NATURE', 'VIEWPOINT']
  };

  return (
    <>
      <button onClick={() => {
        setSelectedPlace(placeData);
        setSidebarOpen(true);
      }}>
        View Details
      </button>

      <PlaceDetailsSidebar
        place={selectedPlace}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}
```

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React (with Hooks)
- lucide-react (for icons)
- React DOM (for Portals)

## Contributing

When adding new features to the sidebar:

1. Maintain the existing design language
2. Ensure mobile responsiveness
3. Add proper prop validation
4. Update this documentation
5. Test on multiple devices

## License

This component is part of the Pathfinder project.
