import React, { useCallback } from 'react';
import { validateCoordinates } from '../utils/geoUtils';
import './LocationList.css';

const LocationList = ({ locations, loading, error, boundary }) => {
  const isLocationInBoundary = useCallback((location) => {
    if (!boundary || !location.longitude || !location.latitude) {
      return false;
    }

    const lng = parseFloat(location.longitude);
    const lat = parseFloat(location.latitude);
    
    if (isNaN(lng) || isNaN(lat)) {
      return false;
    }

    console.log('LocationList - Checking boundary for:', {
      name: location.name,
      coordinates: [lng, lat],
      boundaryPoints: boundary.length
    });

    return validateCoordinates(lng, lat, boundary);
  }, [boundary]);

  if (loading) {
    return <div className="location-list loading">Loading...</div>;
  }

  if (error) {
    return <div className="location-list error">{error}</div>;
  }

  if (!locations.length) {
    return <div className="location-list empty">No locations found</div>;
  }

  return (
    <div className="location-list">
      {locations.map((location, index) => {
        const inBoundary = isLocationInBoundary(location);
        console.log('LocationList - Boundary check result:', {
          name: location.name,
          inBoundary
        });
        
        return (
          <div 
            key={`${location.name}-${index}`}
            className={`location-card ${inBoundary ? 'inside-boundary' : 'outside-boundary'}`}
          >
            <div className={`boundary-indicator ${inBoundary ? 'inside' : 'outside'}`}>
              {inBoundary ? '✓ In Area' : '✗ Outside Area'}
            </div>
            <h3>{location.name}</h3>
            {location.type && <p className="type">{location.type}</p>}
            {location.cuisine && (
              <p className="cuisine">
                Cuisine: {location.cuisine.split(';').join(', ')}
              </p>
            )}
            {location.hours && <p className="hours">Hours: {location.hours}</p>}
            {location.phone && <p className="phone">Phone: {location.phone}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default LocationList; 