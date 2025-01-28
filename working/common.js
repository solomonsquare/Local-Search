import { WebMercatorViewport } from 'viewport-mercator-project';

// Helper function to calculate the minimum or maximum latitude and longitude from a list of coordinates
const calculateMinMaxCoordinates = (coordinates, minOrMax) => {
  let minLatOrMaxLat = minOrMax === 'max' ? -Infinity : Infinity;
  let minLngOrMaxLng = minOrMax === 'max' ? -Infinity : Infinity;

  for (const [lng, lat] of coordinates) {
    minLatOrMaxLat =
      minOrMax === 'max'
        ? Math.max(minLatOrMaxLat, lat)
        : Math.min(minLatOrMaxLat, lat);
    minLngOrMaxLng =
      minOrMax === 'max'
        ? Math.max(minLngOrMaxLng, lng)
        : Math.min(minLngOrMaxLng, lng);
  }

  return [minLatOrMaxLat, minLngOrMaxLng];
};

// Helper function to calculate the bounding box of a list of coordinates
const calculateBounds = (coordinates) => {
  const [maxLat, maxLng] = calculateMinMaxCoordinates(coordinates, 'max');
  const [minLat, minLng] = calculateMinMaxCoordinates(coordinates, 'min');

  return [
    [Number(minLng), Number(minLat)],
    [Number(maxLng), Number(maxLat)],
  ];
};

// Main function to calculate the map bounds based on the coordinates
export const getMapBounds = (coordinates) => {
  const pointsBounds = calculateBounds(coordinates);
  const viewport = new WebMercatorViewport();

  const { longitude, latitude, zoom } = viewport.fitBounds(pointsBounds, {
    padding: 100,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return {
    longitude,
    latitude,
    zoom: coordinates.length === 1 ? 14 : zoom - 1,
  };
};
