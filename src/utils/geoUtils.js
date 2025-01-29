// Utility functions for geographic calculations

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => degrees * Math.PI / 180;

/**
 * Convert radians to degrees
 */
const toDegrees = (radians) => radians * 180 / Math.PI;

/**
 * Calculate the cross product of two vectors
 */
const crossProduct = (p1, p2) => p1[0] * p2[1] - p1[1] * p2[0];

/**
 * Calculate the dot product of two vectors
 */
const dotProduct = (p1, p2) => p1[0] * p2[0] + p1[1] * p2[1];

/**
 * Convert a point from [longitude, latitude] to Cartesian coordinates
 */
const toCartesian = ([lng, lat]) => {
  const lambda = toRadians(lng);
  const phi = toRadians(lat);
  return [
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi)
  ];
};

/**
 * Calculate the great circle distance between two points
 * @param {[number, number]} point1 - [longitude, latitude]
 * @param {[number, number]} point2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
const haversineDistance = (point1, point2) => {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate the area of a triangle using its vertices
 */
const triangleArea = (p1, p2, p3) => {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
};

/**
 * Check if a point is inside a triangle
 */
const isPointInTriangle = (point, triangle) => {
  const [p1, p2, p3] = triangle;
  const totalArea = triangleArea(p1, p2, p3);
  
  const area1 = triangleArea(point, p1, p2);
  const area2 = triangleArea(point, p2, p3);
  const area3 = triangleArea(point, p3, p1);
  
  // Point is inside if sum of areas equals total area
  const sum = area1 + area2 + area3;
  return Math.abs(totalArea - sum) < 1e-10;
};

/**
 * Triangulate a polygon into triangles
 */
const triangulatePolygon = (polygon) => {
  const triangles = [];
  if (polygon.length < 3) return triangles;

  const vertices = [...polygon];
  
  while (vertices.length > 3) {
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      const c = vertices[(i + 2) % vertices.length];
      
      let isEar = true;
      
      // Check if no other vertices are inside this triangle
      for (let j = 0; j < vertices.length; j++) {
        if (j === i || j === (i + 1) % vertices.length || j === (i + 2) % vertices.length) {
          continue;
        }
        if (isPointInTriangle(vertices[j], [a, b, c])) {
          isEar = false;
          break;
        }
      }
      
      if (isEar) {
        triangles.push([a, b, c]);
        vertices.splice((i + 1) % vertices.length, 1);
        break;
      }
    }
  }
  
  // Add the final triangle
  if (vertices.length === 3) {
    triangles.push(vertices);
  }
  
  return triangles;
};

/**
 * Calculate distance from point to line segment
 */
const distanceToLineSegment = (point, lineStart, lineEnd) => {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return haversineDistance(point, [xx, yy]);
};

/**
 * Simple point in polygon check using ray casting
 * @param {[number, number]} point - [longitude, latitude]
 * @param {Array<[number, number]>} polygon - Array of [longitude, latitude] points
 * @returns {boolean}
 */
const simplePointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi));
    
    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Check if a point is too close to any boundary edge
 * @param {[number, number]} point - [longitude, latitude]
 * @param {Array<[number, number]>} polygon - Array of [longitude, latitude] points
 * @param {number} minDistance - Minimum distance in kilometers
 * @returns {boolean}
 */
const isTooCloseToEdge = (point, polygon, minDistance) => {
  // Check distance to each vertex
  for (const vertex of polygon) {
    if (haversineDistance(point, vertex) < minDistance) {
      return true;
    }
  }

  // Check distance to each edge
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const start = polygon[i];
    const end = polygon[j];

    // Calculate multiple points along the edge and check distance
    const steps = 10;
    for (let t = 0; t <= steps; t++) {
      const edgePoint = [
        start[0] + (end[0] - start[0]) * (t / steps),
        start[1] + (end[1] - start[1]) * (t / steps)
      ];
      if (haversineDistance(point, edgePoint) < minDistance) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Create a grid of points to test boundary containment
 */
const createGrid = (bbox, gridSize = 50) => {
  const points = [];
  const latStep = (bbox.maxLat - bbox.minLat) / gridSize;
  const lngStep = (bbox.maxLng - bbox.minLng) / gridSize;

  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += latStep) {
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += lngStep) {
      points.push([lng, lat]);
    }
  }
  return points;
};

/**
 * Create a buffer polygon inside the boundary
 */
const createBufferPolygon = (polygon, bufferDistance) => {
  const center = calculatePolygonCenter(polygon);
  return polygon.map(point => {
    const distanceToCenter = haversineDistance(point, center);
    const ratio = (distanceToCenter - bufferDistance) / distanceToCenter;
    return [
      center[0] + (point[0] - center[0]) * ratio,
      center[1] + (point[1] - center[1]) * ratio
    ];
  });
};

/**
 * Check if a point is inside a polygon using winding number algorithm
 * This is more precise than ray casting for geographic coordinates
 */
const windingNumberPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let wn = 0;  // winding number

  for (let i = 0; i < polygon.length; i++) {
    const [xi, yi] = polygon[i];
    const [xi1, yi1] = polygon[(i + 1) % polygon.length];

    if (yi <= y) {
      if (yi1 > y && isLeft([xi, yi], [xi1, yi1], point) > 0) {
        wn++;
      }
    } else {
      if (yi1 <= y && isLeft([xi, yi], [xi1, yi1], point) < 0) {
        wn--;
      }
    }
  }
  return wn !== 0;
};

/**
 * Helper function for winding number algorithm
 * Tests if point is left|on|right of line segment
 * Returns: > 0 for left, = 0 for on, < 0 for right
 */
const isLeft = (p0, p1, point) => {
  return ((p1[0] - p0[0]) * (point[1] - p0[1]) - 
          (point[0] - p0[0]) * (p1[1] - p0[1]));
};

/**
 * Normalize coordinates to ensure consistent precision and format
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude 
 * @returns {[number, number]} Normalized [longitude, latitude]
 */
const normalizeCoordinates = (lng, lat) => {
  // Round to 6 decimal places (approximately 10cm precision)
  return [
    Math.round(parseFloat(lng) * 1e6) / 1e6,
    Math.round(parseFloat(lat) * 1e6) / 1e6
  ];
};

/**
 * Filter locations to only include those within the boundary
 */
export const filterLocationsWithinBoundary = (locations, boundary) => {
  if (!boundary?.length || boundary.length < 3 || !locations?.length) {
    return [];
  }

  // Normalize boundary coordinates with consistent precision
  const validBoundary = boundary
    .map(([lng, lat]) => normalizeCoordinates(lng, lat))
    .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));

  if (validBoundary.length < 3) return [];

  // Calculate bounding box with normalized coordinates
  const bbox = validBoundary.reduce((acc, [lng, lat]) => ({
    minLng: Math.min(acc.minLng, lng),
    maxLng: Math.max(acc.maxLng, lng),
    minLat: Math.min(acc.minLat, lat),
    maxLat: Math.max(acc.maxLat, lat)
  }), {
    minLng: validBoundary[0][0],
    maxLng: validBoundary[0][0],
    minLat: validBoundary[0][1],
    maxLat: validBoundary[0][1]
  });

  // Add small buffer to handle coordinate system differences (approximately 100m)
  const buffer = 0.001; // ~100m in decimal degrees
  bbox.minLng -= buffer;
  bbox.maxLng += buffer;
  bbox.minLat -= buffer;
  bbox.maxLat += buffer;

  return locations.filter(location => {
    // Normalize location coordinates
    const [lng, lat] = normalizeCoordinates(
      parseFloat(location.longitude),
      parseFloat(location.latitude)
    );
    
    if (isNaN(lng) || isNaN(lat)) return false;

    // 1. Basic bounding box check
    if (lng < bbox.minLng || lng > bbox.maxLng ||
        lat < bbox.minLat || lat > bbox.maxLat) {
      return false;
    }

    // 2. Ray casting with normalized coordinates
    let inside = false;
    for (let i = 0, j = validBoundary.length - 1; i < validBoundary.length; j = i++) {
      const [xi, yi] = validBoundary[i];
      const [xj, yj] = validBoundary[j];

      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi));
      
      if (intersect) inside = !inside;
    }

    // If point is not inside the boundary at all, exclude it
    if (!inside) return false;

    // 3. Check distance from boundary edges with a small tolerance
    for (let i = 0; i < validBoundary.length; i++) {
      const j = (i + 1) % validBoundary.length;
      const distance = distanceToLineSegment([lng, lat], validBoundary[i], validBoundary[j]);
      // Use a smaller buffer (100m) since we're using normalized coordinates
      if (distance < 0.1) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Calculate the center point of a polygon
 */
export const calculatePolygonCenter = (polygon) => {
  if (!polygon?.length) return [0, 0];

  const validPoints = polygon
    .map(([lng, lat]) => [parseFloat(lng), parseFloat(lat)])
    .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));

  if (validPoints.length === 0) return [0, 0];

  return validPoints.reduce(
    ([sumLng, sumLat], [lng, lat]) => [sumLng + lng, sumLat + lat],
    [0, 0]
  ).map(sum => sum / validPoints.length);
};

/**
 * Calculate the bounding box of a polygon
 * @param {Array<[number, number]>} polygon - Array of [longitude, latitude] points
 * @returns {Object} - {minLng, maxLng, minLat, maxLat}
 */
export const calculateBoundingBox = (polygon) => {
  if (!polygon || polygon.length === 0) {
    return { minLng: 0, maxLng: 0, minLat: 0, maxLat: 0 };
  }

  return polygon.reduce((bounds, point) => {
    return {
      minLng: Math.min(bounds.minLng, point[0]),
      maxLng: Math.max(bounds.maxLng, point[0]),
      minLat: Math.min(bounds.minLat, point[1]),
      maxLat: Math.max(bounds.maxLat, point[1])
    };
  }, {
    minLng: polygon[0][0],
    maxLng: polygon[0][0],
    minLat: polygon[0][1],
    maxLat: polygon[0][1]
  });
};

/**
 * Check if a point is strictly inside a polygon with buffer
 * @param {[number, number]} point - [longitude, latitude]
 * @param {Array<[number, number]>} polygon - Array of [longitude, latitude] points
 * @returns {boolean}
 */
const isPointStrictlyInside = (point, polygon) => {
  const [x, y] = point;
  let inside = false;

  // First check: Ray casting
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi));
    
    if (intersect) inside = !inside;
  }

  if (!inside) return false;

  // Second check: Distance from edges
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    // Calculate perpendicular distance to line segment
    const A = x - xi;
    const B = y - yi;
    const C = xj - xi;
    const D = yj - yi;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let nearestX, nearestY;
    if (param < 0) {
      nearestX = xi;
      nearestY = yi;
    } else if (param > 1) {
      nearestX = xj;
      nearestY = yj;
    } else {
      nearestX = xi + param * C;
      nearestY = yi + param * D;
    }

    const dx = x - nearestX;
    const dy = y - nearestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If point is too close to any edge, exclude it
    if (distance < 0.01) { // roughly 1km in degrees
      return false;
    }
  }

  return true;
};

/**
 * Validate if coordinates are within the boundary using ray casting algorithm
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {Array<[number, number]>} boundary - Array of boundary points
 * @returns {boolean}
 */
export const validateCoordinates = (lng, lat, boundary) => {
  // Log input parameters
  console.log('validateCoordinates called with:', {
    coordinates: { lng, lat },
    boundaryPoints: boundary?.length,
    firstBoundaryPoint: boundary?.[0],
    lastBoundaryPoint: boundary?.[boundary?.length - 1]
  });

  // Basic input validation
  if (!boundary?.length || boundary.length < 3 || 
      typeof lng !== 'number' || typeof lat !== 'number' ||
      isNaN(lng) || isNaN(lat)) {
    console.log('validateCoordinates - Invalid input:', {
      hasValidBoundary: boundary?.length >= 3,
      hasValidCoordinates: !isNaN(lng) && !isNaN(lat)
    });
    return false;
  }

  // Normalize coordinates to handle edge cases
  const point = normalizeCoordinates(lng, lat);
  const normalizedBoundary = boundary.map(([x, y]) => normalizeCoordinates(x, y));

  // First check: Bounding box for quick rejection
  const bbox = calculateBoundingBox(normalizedBoundary);
  if (point[0] < bbox.minLng || point[0] > bbox.maxLng ||
      point[1] < bbox.minLat || point[1] > bbox.maxLat) {
    console.log('validateCoordinates - Outside bounding box');
    return false;
  }

  // Ray casting algorithm implementation
  let inside = false;
  for (let i = 0, j = normalizedBoundary.length - 1; i < normalizedBoundary.length; j = i++) {
    const [xi, yi] = normalizedBoundary[i];
    const [xj, yj] = normalizedBoundary[j];

    // Check if point is exactly on boundary edge
    if ((point[1] === yi && point[0] === xi) || (point[1] === yj && point[0] === xj)) {
      console.log('validateCoordinates - Point is on boundary edge');
      return true;
    }

    // Check if ray from point crosses this edge
    const intersect = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi));
    
    if (intersect) inside = !inside;
  }

  console.log('validateCoordinates - Result:', {
    coordinates: { lng, lat },
    isInside: inside
  });

  return inside;
}; 