import React, { useEffect, useState, useCallback } from 'react';
import MapGL, { Layer, Source, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapBounds } from '../helper/common';

// Initial view state for the map
const initialViewState = {
  latitude: 1.29027,
  longitude: 103.851959,
  zoom: 10,
  bearing: 0,
  pitch: 0,
};

// Helper function to create a polygon from a point
const createPolygonFromPoint = (longitude, latitude, radiusInKm = 1) => {
  const points = 32; // Number of points to create the circle
  const coords = [];
  const kmInLongitudeDegree = 111.320 * Math.cos(latitude * Math.PI / 180);
  
  // Convert km to degrees for lat/lon
  const radiusLat = radiusInKm / 111.0;
  const radiusLon = radiusInKm / kmInLongitudeDegree;

  for (let i = 0; i < points; i++) {
    const angle = (i * 360 / points) * Math.PI / 180;
    const x = longitude + radiusLon * Math.cos(angle);
    const y = latitude + radiusLat * Math.sin(angle);
    coords.push([x, y]);
  }
  
  // Close the polygon by repeating the first point
  coords.push(coords[0]);
  
  return [coords]; // Return as polygon coordinates array
};

function MapBox({ coordinates }) {
  const [viewState, setViewState] = useState(initialViewState);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!coordinates?.length) {
      setViewState(initialViewState);
      return;
    }

    try {
      if (Array.isArray(coordinates[0])) {
        const bounds = getMapBounds(coordinates[0]);
        setViewState((prev) => ({ ...prev, ...bounds }));
      }
    } catch (error) {
      console.error('Error setting map bounds:', error);
    }
  }, [coordinates]);

  const onLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const validCoordinates =
    coordinates?.length > 0 && Array.isArray(coordinates[0]);

  // Handle point coordinates by converting them to a polygon
  const getPolygonCoordinates = () => {
    if (!validCoordinates) return null;
    
    // If coordinates is a single point (not a polygon)
    if (!Array.isArray(coordinates[0][0])) {
      const [longitude, latitude] = coordinates[0];
      return createPolygonFromPoint(longitude, latitude);
    }
    
    return coordinates;
  };

  const token = process.env.REACT_APP_MAPBOX_KEY;
  if (!token || !token.startsWith('pk.')) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Please provide a valid public Mapbox token starting with &quot;pk.&quot;
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <MapGL
        {...viewState}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        onMove={(evt) => setViewState(evt.viewState)}
        onLoad={onLoad}
        dragRotate={false}
        touchZoomRotate={false}
        scrollZoom={false}
        minZoom={2}
        maxZoom={20}
        attributionControl={true}
        interactive={true}
        cursor="default"
        renderWorldCopies={false}
        mapboxApiAccessToken={token}
        preserveDrawingBuffer={true}
      >
        <NavigationControl position="top-right" />
        
        {mapLoaded && validCoordinates && (
          <Source
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: getPolygonCoordinates(),
              },
              properties: {},
            }}
            generateId={true}
          >
            <Layer
              id="polygon-fill"
              type="fill"
              paint={{
                'fill-color': '#E14C48',
                'fill-opacity': 0.15,
              }}
              beforeId="waterway-label"
              maxzoom={22}
            />
            <Layer
              id="polygon-outline"
              type="line"
              paint={{
                'line-color': '#000',
                'line-width': 3,
              }}
              beforeId="waterway-label"
              maxzoom={22}
            />
          </Source>
        )}
      </MapGL>
    </div>
  );
}

export default MapBox;
