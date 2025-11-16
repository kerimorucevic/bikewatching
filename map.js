import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);
mapboxgl.accessToken = 'pk.eyJ1Ijoia2VyaW1vcnVjZXZpYyIsImEiOiJjbWkwcXd5cHUwbWsxMnFvZ3dxMDJhOW5rIn0.s3BNdFXz5ltRt8vJ6y_U1g';
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);



function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
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
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
  });
  
  map.on('load', async () => {
    // --- bike lanes: Boston ---
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });
  
    map.addLayer({
      id: 'bike-lanes-boston',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': '#32D400',
        'line-width': 4,
        'line-opacity': 0.6,
      },
    });
  
    // --- bike lanes: Cambridge ---
    try {
      const cambridgeResp = await fetch(
        'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
      );
      if (!cambridgeResp.ok) {
        throw new Error(`Cambridge HTTP ${cambridgeResp.status}`);
      }
      const cambridgeGeojson = await cambridgeResp.json();
  
      map.addSource('cambridge_route', {
        type: 'geojson',
        data: cambridgeGeojson,
      });
  
      map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        paint: {
          'line-color': '#32D400',
          'line-width': 4,
          'line-opacity': 0.6,
        },
      });
    } catch (err) {
      console.error('Failed to load Cambridge bike lanes:', err);
    }
  
    // ---------- LOAD STATIONS ----------
    const svg = d3.select('#map').select('svg');
  
    let stationsJson;
    try {
      stationsJson = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    } catch (err) {
      console.error('Error loading stations JSON:', err);
      return;
    }
    const baseStations = stationsJson.data.stations;
  
    // ---------- LOAD TRIPS + BUCKET BY MINUTE ----------
    let trips;
    try {
      trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
  
        const sMin = minutesSinceMidnight(trip.started_at);
        const eMin = minutesSinceMidnight(trip.ended_at);
  
        if (sMin >= 0 && sMin < 1440) {
          departuresByMinute[sMin].push(trip);
        }
        if (eMin >= 0 && eMin < 1440) {
          arrivalsByMinute[eMin].push(trip);
        }
  
        return trip;
      });
    } catch (err) {
      console.error('Error loading trips CSV:', err);
      return;
    }
  
    console.log('Loaded trips:', trips.length);
  
    // ---------- INITIAL TRAFFIC + SCALE ----------
    let stations = computeStationTraffic(baseStations); // timeFilter = -1
    let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);
  
    // circles, keyed by short_name
    let circles = svg
      .selectAll('circle')
      .data(stations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) =>
        stationFlow(d.departures / d.totalTraffic),
      );
    
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
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) =>
        stationFlow(d.departures / d.totalTraffic),
    );

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
    

    
      








  


