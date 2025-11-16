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
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
  }
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
    
      const cambridgeUrl = 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson';

    try {
        const response = await fetch(cambridgeUrl);
        if (!response.ok) {
         throw new Error(`HTTP ${response.status} while fetching Cambridge data`);
        }
        const cambridgeGeojson = await response.json();

        map.addSource('cambridge_route', {
        type: 'geojson',
        data: cambridgeGeojson,
        });

        map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#32D400',  // red
            'line-width': 5,
            'line-opacity': 0.6,
        },
        });
    } catch (err) {
        console.error('Failed to load Cambridge bike lanes:', err);
    }
    
    
        //previous code
    const svg = d3.select('#map').select('svg');

    let jsonData;
    try {
          const jsonurl = INPUT_BLUEBIKES_CSV_URL;
      
          // Await JSON fetch
          const jsonData = await d3.json(jsonurl);
      
          console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    } catch (error) {
          console.error('Error loading JSON:', error); // Handle errors
        }
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);
        stations = stations.map((d) => ({
            ...d,
            lat: +d.Lat,
            lon: +d.Long,
          }));
    const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5) // Radius of the circle
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8); // Circle opacity
    function updatePositions() {
        circles
          .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
          .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
        }
    updatePositions();
    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends

});
        
    
        
  
  // Initial position update when map loads
    

    
      








  


