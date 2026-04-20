/**
 * Mock shipment data for the supply chain simulator.
 * 8 shipments across Indian cities with realistic waypoint routes.
 */

export const CITIES = {
  mumbai:    { name: 'Mumbai',     lat: 19.076,  lng: 72.877 },
  delhi:     { name: 'Delhi',      lat: 28.613,  lng: 77.209 },
  chennai:   { name: 'Chennai',    lat: 13.083,  lng: 80.270 },
  kolkata:   { name: 'Kolkata',    lat: 22.572,  lng: 88.363 },
  bangalore: { name: 'Bangalore',  lat: 12.972,  lng: 77.594 },
  hyderabad: { name: 'Hyderabad',  lat: 17.385,  lng: 78.486 },
  pune:      { name: 'Pune',       lat: 18.520,  lng: 73.856 },
  jaipur:    { name: 'Jaipur',     lat: 26.912,  lng: 75.787 },
  ahmedabad: { name: 'Ahmedabad',  lat: 23.023,  lng: 72.571 },
  lucknow:   { name: 'Lucknow',   lat: 26.847,  lng: 80.947 },
  nagpur:    { name: 'Nagpur',     lat: 21.146,  lng: 79.088 },
  indore:    { name: 'Indore',     lat: 22.720,  lng: 75.858 },
  bhopal:    { name: 'Bhopal',     lat: 23.259,  lng: 77.413 },
};

/**
 * Generate intermediate waypoints between two cities.
 * Creates a slightly curved path for realism.
 */
function generateWaypoints(origin, destination, numPoints = 8) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Add a slight curve to the path
    const curveFactor = Math.sin(t * Math.PI) * 0.5;
    const lat = origin.lat + (destination.lat - origin.lat) * t +
                curveFactor * (Math.random() * 0.4 - 0.2);
    const lng = origin.lng + (destination.lng - origin.lng) * t +
                curveFactor * (Math.random() * 0.4 - 0.2);
    points.push([lat, lng]);
  }
  return points;
}

export const mockShipments = [
  {
    id: 'SHP-001',
    origin: CITIES.mumbai,
    destination: CITIES.delhi,
    route: generateWaypoints(CITIES.mumbai, CITIES.delhi, 10),
    speed: 55,
    estimatedTime: 1440,
    status: 'on-time',
    riskScore: 0.12,
    progress: 0.0,
    cargo: 'Electronics',
    priority: 'high',
    weight: '12,000 kg',
  },
  {
    id: 'SHP-002',
    origin: CITIES.chennai,
    destination: CITIES.kolkata,
    route: generateWaypoints(CITIES.chennai, CITIES.kolkata, 10),
    speed: 48,
    estimatedTime: 1680,
    status: 'on-time',
    riskScore: 0.08,
    progress: 0.0,
    cargo: 'Pharmaceuticals',
    priority: 'critical',
    weight: '5,400 kg',
  },
  {
    id: 'SHP-003',
    origin: CITIES.bangalore,
    destination: CITIES.hyderabad,
    route: generateWaypoints(CITIES.bangalore, CITIES.hyderabad, 8),
    speed: 60,
    estimatedTime: 600,
    status: 'on-time',
    riskScore: 0.05,
    progress: 0.0,
    cargo: 'Auto Parts',
    priority: 'medium',
    weight: '8,200 kg',
  },
  {
    id: 'SHP-004',
    origin: CITIES.pune,
    destination: CITIES.jaipur,
    route: generateWaypoints(CITIES.pune, CITIES.jaipur, 10),
    speed: 50,
    estimatedTime: 1200,
    status: 'on-time',
    riskScore: 0.18,
    progress: 0.0,
    cargo: 'Textiles',
    priority: 'low',
    weight: '15,800 kg',
  },
  {
    id: 'SHP-005',
    origin: CITIES.delhi,
    destination: CITIES.chennai,
    route: generateWaypoints(CITIES.delhi, CITIES.chennai, 12),
    speed: 52,
    estimatedTime: 2100,
    status: 'on-time',
    riskScore: 0.10,
    progress: 0.0,
    cargo: 'FMCG Goods',
    priority: 'high',
    weight: '20,000 kg',
  },
  {
    id: 'SHP-006',
    origin: CITIES.ahmedabad,
    destination: CITIES.kolkata,
    route: generateWaypoints(CITIES.ahmedabad, CITIES.kolkata, 12),
    speed: 45,
    estimatedTime: 2400,
    status: 'on-time',
    riskScore: 0.14,
    progress: 0.0,
    cargo: 'Chemicals',
    priority: 'critical',
    weight: '9,600 kg',
  },
  {
    id: 'SHP-007',
    origin: CITIES.lucknow,
    destination: CITIES.bangalore,
    route: generateWaypoints(CITIES.lucknow, CITIES.bangalore, 12),
    speed: 50,
    estimatedTime: 2200,
    status: 'on-time',
    riskScore: 0.09,
    progress: 0.0,
    cargo: 'Machinery',
    priority: 'medium',
    weight: '25,000 kg',
  },
  {
    id: 'SHP-008',
    origin: CITIES.jaipur,
    destination: CITIES.mumbai,
    route: generateWaypoints(CITIES.jaipur, CITIES.mumbai, 10),
    speed: 58,
    estimatedTime: 1080,
    status: 'on-time',
    riskScore: 0.06,
    progress: 0.0,
    cargo: 'Perishables',
    priority: 'high',
    weight: '7,200 kg',
  },
];
