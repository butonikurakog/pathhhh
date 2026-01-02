// Selected tourist spots - one per municipality
// ONLY using spots that actually exist in the GeoJSON files
export const selectedSpots = [
  {
    municipality: 'VIRAC',
    spotName: 'Marilima Beach',
    geojsonFile: 'VIRAC.geojson'
  },
  {
    municipality: 'BATO',
    spotName: 'Bote Lighthouse',
    geojsonFile: 'BATO.geojson'
  },
  {
    municipality: 'BARAS',
    spotName: 'Binurong Point',
    geojsonFile: 'baras.geojson'
  },
  {
    municipality: 'SAN_MIGUEL',
    spotName: 'San Miguel Church',
    geojsonFile: 'san_miguel.geojson'
  },
  {
    municipality: 'BAGAMANOC',
    spotName: 'Paday Falls',
    geojsonFile: 'bagamanoc.geojson'
  },
  {
    municipality: 'VIGA',
    spotName: 'Cogon Hills',
    geojsonFile: 'viga.geojson'
  },
  {
    municipality: 'PANGANIBAN',
    spotName: 'Tuwad-Tuwadan Lagoon',
    geojsonFile: 'panganiban.geojson'
  },
  {
    municipality: 'PANDAN',
    spotName: 'Immaculate Conception Parish Church',
    geojsonFile: 'pandan.geojson'
  },
  {
    municipality: 'CARAMORAN',
    spotName: 'Mamangal Beach',
    geojsonFile: 'caramoran.geojson'
  },
  {
    municipality: 'GIGMOTO',
    spotName: 'Gigmoto Lighthouse',
    geojsonFile: 'gigmoto.geojson'
  },
  {
    municipality: 'SAN_ANDRES',
    spotName: 'San Andres Beach',
    geojsonFile: 'san_andres.geojson'
  }
];

// Helper function to convert municipality name to sentence case
export const toSentenceCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Category colors for the pill badges
export const categoryColors = {
  BEACH: { bg: '#dbeafe', text: '#1e40af' },
  WATERFALL: { bg: '#d1fae5', text: '#065f46' },
  VIEWPOINT: { bg: '#fce7f3', text: '#9f1239' },
  NATURE: { bg: '#dcfce7', text: '#14532d' },
  ACCOMMODATION: { bg: '#fef3c7', text: '#92400e' },
  RESORT: { bg: '#fed7aa', text: '#9a3412' },
  CAFE: { bg: '#e0e7ff', text: '#3730a3' },
  RESTAURANT: { bg: '#fecaca', text: '#991b1b' },
  MUSEUM: { bg: '#e9d5ff', text: '#6b21a8' },
  HERITAGE: { bg: '#f3e8ff', text: '#581c87' },
  RELIGIOUS_SITE: { bg: '#ddd6fe', text: '#4c1d95' },
  SURFING: { bg: '#bfdbfe', text: '#1e3a8a' },
  LANDMARK: { bg: '#fbbf24', text: '#78350f' },
  ECO_PARK: { bg: '#86efac', text: '#14532d' },
  HIKING: { bg: '#fdba74', text: '#7c2d12' },
  ISLAND: { bg: '#99f6e4', text: '#134e4a' },
  BAR: { bg: '#fca5a5', text: '#7f1d1d' },
  PARK: { bg: '#bef264', text: '#3f6212' },
  default: { bg: '#f3f4f6', text: '#1f2937' }
};
