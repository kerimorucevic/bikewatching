import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);
mapboxgl.accessToken = 'pk.eyJ1Ijoia2VyaW1vcnVjZXZpYyIsImEiOiJjbWkwcXd5cHUwbWsxMnFvZ3dxMDJhOW5rIn0.s3BNdFXz5ltRt8vJ6y_U1g';
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

// ---------- HELPERS ----------
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// efficient: get trips around a minute using pre-filled buckets
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    // no filter: flatten all
    return tripsByMinute.flat();
  }

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    // wraps past midnight
    const beforeMidnight = tripsByMinute.slice(minMinute);
    const afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

// compute arrivals / departures / totalTraffic for each station,
// using the global departuresByMinute / arrivalsByMinute
function computeStationTraffic(baseStations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id,
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return baseStations.map((station) => {
    const lat = +((station.Lat ?? station.lat));
    const lon = +((station.Long ?? station.lon));
    const id = station.short_name;

    const arr = arrivals.get(id) ?? 0;
    const dep = departures.get(id) ?? 0;
    const totalTraffic = arr + dep;

    return {
      ...station,
      lat,
      lon,
      arrivals: arr,
      departures: dep,
      totalTraffic,
    };
  });
}
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

    /*let jsonData;
    try {
          const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
      
          // Await JSON fetch
          jsonData = await d3.json(jsonurl);
      
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
    */
    let jsonData;
    try {
      const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'; // or the literal JSON URL
      jsonData = await d3.json(jsonurl);
      console.log('Loaded JSON Data:', jsonData);
    } catch (error) {
      console.error('Error loading JSON:', error);
      return; // bail if stations fail
    }
    
    // 1) Get stations from JSON
    let stations = jsonData.data.stations;
    console.log('Example station before mapping:', stations[0]);
    
    // 2) Load trips CSV (Step 4.1)
    // If your starter code gives a constant like INPUT_TRAFFIC_CSV_URL or similar,
    // use that here instead of hardcoding:
    const tripsUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'; // <-- replace with your lab's constant or URL
    
    let trips;
    try {
      trips = await d3.csv(tripsUrl, d3.autoType); // parse numbers automatically
      console.log('Example trip:', trips[0]);
    } catch (error) {
      console.error('Error loading trips CSV:', error);
      return; // bail if trips fail
    }
    
    // 3) Compute departures and arrivals (Step 4.2)
    const departures = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.start_station_id,
    );
    
    const arrivals = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.end_station_id,
    );
    
    // 4) Normalize lat/lon and attach arrivals, departures, totalTraffic to each station
    stations = stations
      .map((station) => {
        const lat = +((station.Lat ?? station.lat));
        const lon = +((station.Long ?? station.lon));
    
        // ID used to match with trips. Lab instructions say: station.short_name
        const id = station.short_name;
    
        const arr = arrivals.get(id) ?? 0;
        const dep = departures.get(id) ?? 0;
        const totalTraffic = arr + dep;
    
        return {
          ...station,
          lat,
          lon,
          arrivals: arr,
          departures: dep,
          totalTraffic,
        };
      })
      .filter(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lon) &&
          Number.isFinite(s.totalTraffic),
      );
    
    console.log('Stations with traffic:', stations.slice(0, 5));
    
    // 5) Build square-root radius scale (Step 4.3)
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]); // min/max radius in pixels
    
    // 6) Draw circles, sizing by totalTraffic
    const circles = svg
      .selectAll('circle')
  // all other previously defined attributes omitted for brevity
      .each(function (d) {
    // Add <title> for browser tooltips
        d3.select(this)
          .append('title')
          .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
          );
  });
    
    // 7) Keep them positioned correctly on the map
    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }
    
    updatePositions();
    
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    let currentTimeFilter = -1;

    function updateScatterPlot(timeFilter) {
    // recompute traffic for this time window
        const filteredStations = computeStationTraffic(baseStations, timeFilter);

    // adjust radius range depending on filter
        if (timeFilter === -1) {
        radiusScale.range([0, 25]);
        } else {
        radiusScale.range([3, 50]);
        }

    stations = filteredStations;

    circles = svg
      .selectAll('circle')
      .data(filteredStations, (d) => d.short_name)
      .join('circle')
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .attr('r', (d) => radiusScale(d.totalTraffic));

    updatePositions();
  }

  function updateTimeDisplay() {
    currentTimeFilter = Number(timeSlider.value);

    if (currentTimeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(currentTimeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(currentTimeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});
        
    
        
  
  // Initial position update when map loads
    

    
      








  


