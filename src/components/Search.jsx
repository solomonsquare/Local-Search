import React, { useState, useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

const Search = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuggestions = useCallback(
    debounce(async (value) => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(value)}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    }, 300),
    []
  );

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);

    try {
      // Extract location name from query (e.g., "restaurants in london" -> "london")
      const locationMatch = query.match(/\s+in\s+([^]+)$/i);
      const locationName = locationMatch ? locationMatch[1] : query;

      // First, get the boundary data
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&polygon_geojson=1`
      );

      if (!nominatimResponse.ok) {
        throw new Error('Failed to fetch boundary data');
      }

      const nominatimData = await nominatimResponse.json();
      console.log('Search - Raw Nominatim response:', nominatimData);

      // Find the administrative boundary result
      const areaData = nominatimData.find(
        item => item.geojson && 
        (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon') &&
        item.type === 'administrative'
      );

      let boundaryCoordinates = null;
      if (areaData?.geojson?.coordinates) {
        // Handle both Polygon and MultiPolygon types
        if (areaData.geojson.type === 'Polygon') {
          // Extract the first (outer) ring of coordinates
          boundaryCoordinates = areaData.geojson.coordinates[0];
        } else if (areaData.geojson.type === 'MultiPolygon') {
          // Take the first polygon's outer ring
          boundaryCoordinates = areaData.geojson.coordinates[0][0];
        }
      }

      console.log('Search - Extracted boundary:', {
        type: areaData?.geojson?.type,
        coordinates: boundaryCoordinates
      });

      // Only proceed with boundary if we have at least 3 points
      if (!boundaryCoordinates || boundaryCoordinates.length < 3) {
        console.warn('Search - Invalid or missing boundary data');
        boundaryCoordinates = null;
      }

      onSearch(query, boundaryCoordinates);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length >= 3) {
      setShowSuggestions(true);
      fetchSuggestions(value);
    } else {
      clearSuggestions();
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSearch();
    } else if (e.key === 'Escape') {
      clearSuggestions();
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setQuery(suggestion.description);
    clearSuggestions();
    await handleSearch(suggestion.description);
  };

  const clearSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        clearSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="search-container" ref={searchRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search for places..."
        className="search-input"
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-container">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="suggestion-main">{suggestion.main_text}</div>
              <div className="suggestion-secondary">{suggestion.secondary_text}</div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .search-container {
          position: relative;
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
        }

        .search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .suggestions-container {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-top: 4px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }

        .suggestion-item {
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid #e5e7eb;
        }

        .suggestion-item:last-child {
          border-bottom: none;
        }

        .suggestion-item:hover {
          background: #f9fafb;
        }

        .suggestion-main {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .suggestion-secondary {
          font-size: 14px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default Search; 