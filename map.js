import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);
mapboxgl.accessToken = 'pk.eyJ1Ijoia2VyaW1vcnVjZXZpYyIsImEiOiJjbWkwcXd5cHUwbWsxMnFvZ3dxMDJhOW5rIn0.s3BNdFXz5ltRt8vJ6y_U1g';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});
map.on('load', async () => {
    //code
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
      });
      map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
          }
      });
      map.addSource('cambridge', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
      });
      map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#FF0000',  
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
          }
      });
  });
