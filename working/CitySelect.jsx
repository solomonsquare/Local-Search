import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import debounce from 'lodash/debounce';

const CitySelect = ({ setCoordinates }) => {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState([]);
  const [listCities, setListCity] = useState([]);
  const [selectedCity, setSelectedCity] = useState();

  useEffect(() => {
    if (selectedCity) {
      const selectedCityData = listCities.find(
        (el) => el.place_id === selectedCity
      );

      if (selectedCityData) {
        // Handle polygon data if available
        if (
          selectedCityData?.geojson?.type === 'Polygon' &&
          Array.isArray(selectedCityData?.geojson?.coordinates) &&
          selectedCityData.geojson.coordinates.length > 0
        ) {
          setCoordinates(selectedCityData.geojson.coordinates);
        }
        // Handle point data (node type locations)
        else if (selectedCityData.lat && selectedCityData.lon) {
          setCoordinates([[parseFloat(selectedCityData.lon), parseFloat(selectedCityData.lat)]]);
        }
        else {
          console.warn(
            'Invalid or missing location data for selected city'
          );
          setCoordinates([]);
        }
      }
    } else {
      setCoordinates([]);
    }
  }, [selectedCity, listCities, setCoordinates]);

  const debounceFetchListCity = debounce(async (searchValue) => {
    setListCity([]);
    setOptions([]);

    if (searchValue?.length > 5) {
      try {
        setFetching(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search.php?q=${searchValue}&polygon_geojson=1&format=json`
        );
        const body = await response.json();
        if (Array.isArray(body)) {
          // Accept both polygon and point-based locations
          const validLocations = body.filter(
            (result) =>
              (result.geojson?.type === 'Polygon' &&
               Array.isArray(result.geojson?.coordinates) &&
               result.geojson.coordinates.length > 0) ||
              (result.lat && result.lon) // Accept point-based locations
          );

          setListCity(validLocations);
          const options = validLocations.map((result) => ({
            label: result.display_name,
            value: result.place_id,
          }));
          setOptions(options);
        }
      } catch (error) {
        console.error('Error fetching city list:', error);
        setListCity([]);
        setOptions([]);
      } finally {
        setFetching(false);
      }
    }
  }, 800);

  return (
    <Select
      showSearch
      filterOption={false}
      value={selectedCity}
      placeholder="Select city"
      onSearch={debounceFetchListCity}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      onChange={(value) => {
        setSelectedCity(value);
        if (!value) {
          setCoordinates([]);
        }
      }}
      options={options}
      style={{ width: '100%' }}
    />
  );
};

export default CitySelect;
