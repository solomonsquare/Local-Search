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
                coordinates: coordinates,
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
