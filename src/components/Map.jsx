import React, { useEffect, useState } from 'react';
import MapGL, { Marker, Layer, Source, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { validateCoordinates } from '../utils/geoUtils';

const Map = ({ 
  boundary, 
  locations, 
  selectedLocation, 
  onLocationSelect,
  mapboxToken 
}) => {
  const [viewState, setViewState] = useState({
    latitude: 0,
    longitude: 0,
    zoom: 2,
    bearing: 0,
    pitch: 0
  });

  // Update map view when boundary changes
  useEffect(() => {
    if (boundary && boundary.length > 0) {
      // Calculate bounding box
      const bbox = boundary.reduce((acc, [lng, lat]) => ({
        minLng: Math.min(acc.minLng, lng),
        maxLng: Math.max(acc.maxLng, lng),
        minLat: Math.min(acc.minLat, lat),
        maxLat: Math.max(acc.maxLat, lat)
      }), {
        minLng: boundary[0][0],
        maxLng: boundary[0][0],
        minLat: boundary[0][1],
        maxLat: boundary[0][1]
      });

      // Calculate center
      const centerLng = (bbox.minLng + bbox.maxLng) / 2;
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;

      // Calculate zoom based on bounding box size
      const latDiff = bbox.maxLat - bbox.minLat;
      const lngDiff = bbox.maxLng - bbox.minLng;
      const maxDiff = Math.max(latDiff, lngDiff);
      const zoom = Math.floor(8 - Math.log2(maxDiff));

      setViewState(prev => ({
        ...prev,
        latitude: centerLat,
        longitude: centerLng,
        zoom: Math.min(Math.max(zoom, 2), 16) // Clamp zoom between 2 and 16
      }));
    }
  }, [boundary]);

  const renderMarkers = () => {
    return locations.map((location) => {
      // Handle all possible coordinate formats
      const lng = parseFloat(location.lon || location.longitude || location.lng || location.long);
      const lat = parseFloat(location.lat || location.latitude);
      
      // Debug logging
      console.log('Map marker coordinates:', { name: location.name, lng, lat });
      
      // Skip invalid coordinates
      if (isNaN(lng) || isNaN(lat)) {
        console.log('Invalid coordinates for:', location.name);
        return null;
      }
      
      const isInBoundary = boundary && boundary.length > 0 ? validateCoordinates(lng, lat, boundary) : true;
      
      // Debug logging
      console.log('Marker in boundary:', { name: location.name, isInBoundary });

      return (
        <Marker
          key={location.id || location.place_id || location.name}
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onLocationSelect(location);
          }}
        >
          <div 
            style={{
              width: '24px',
              height: '24px',
              background: selectedLocation?.id === location.id 
                ? '#E14C48' 
                : isInBoundary ? '#2563eb' : '#9CA3AF',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease',
              transform: selectedLocation?.id === location.id ? 'scale(1.2)' : 'scale(1)'
            }}
          />
        </Marker>
      );
    }).filter(Boolean);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapGL
        {...viewState}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        onMove={(evt) => setViewState(evt.viewState)}
        dragRotate={false}
        touchZoomRotate={false}
        minZoom={2}
        maxZoom={20}
      >
        <NavigationControl position="top-right" />
        
        {/* Render boundary polygon */}
        {boundary && boundary.length > 0 && (
          <Source
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [boundary]
              },
              properties: {}
            }}
          >
            <Layer
              id="boundary-fill"
              type="fill"
              paint={{
                'fill-color': '#2563eb',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="boundary-line"
              type="line"
              paint={{
                'line-color': '#2563eb',
                'line-width': 2
              }}
            />
          </Source>
        )}

        {/* Render location markers */}
        {renderMarkers()}
      </MapGL>
    </div>
  );
};

export default Map; 