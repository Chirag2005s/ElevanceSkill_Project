/**
 * Calculates distance in kilometers between two geographic coordinates using the Haversine formula.
 * Accepts either (lat1, lon1, lat2, lon2) or two GeoJSON coordinate arrays [lng, lat].
 */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (
        lat1 === undefined ||
        lon1 === undefined ||
        lat2 === undefined ||
        lon2 === undefined ||
        Number.isNaN(Number(lat1)) ||
        Number.isNaN(Number(lon1)) ||
        Number.isNaN(Number(lat2)) ||
        Number.isNaN(Number(lon2))
    ) {
        return 3.5; // Default urban fallback distance in km
    }

    const R = 6371; // Earth's mean radius in km
    const dLat = toRadians(Number(lat2) - Number(lat1));
    const dLon = toRadians(Number(lon2) - Number(lon1));

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(Number(lat1))) *
            Math.cos(toRadians(Number(lat2))) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Multiply by 1.22 road-winding factor to approximate actual street distance
    const roadDistance = R * c * 1.22;
    return Number(Math.max(0.5, roadDistance).toFixed(2));
};

/**
 * Calculates distance from two GeoJSON Point objects or [lng, lat] coordinate arrays.
 */
const calculateGeoJsonDistanceKm = (pointA, pointB) => {
    const coordsA = Array.isArray(pointA) ? pointA : pointA?.coordinates;
    const coordsB = Array.isArray(pointB) ? pointB : pointB?.coordinates;

    if (!coordsA || !coordsB || coordsA.length < 2 || coordsB.length < 2) {
        return 3.5;
    }

    // GeoJSON format is [longitude, latitude]
    const [lon1, lat1] = coordsA;
    const [lon2, lat2] = coordsB;
    return calculateDistanceKm(lat1, lon1, lat2, lon2);
};

/**
 * Estimates delivery travel duration in minutes based on distance (km) and average city speed (22 km/h)
 */
const estimateTravelMinutes = (distanceKm, prepTimeMinutes = 15) => {
    const travelTime = Math.ceil((Number(distanceKm) / 22) * 60);
    return Math.max(15, prepTimeMinutes + travelTime);
};

module.exports = {
    calculateDistanceKm,
    calculateGeoJsonDistanceKm,
    estimateTravelMinutes,
};

