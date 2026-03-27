import { prisma } from '@/lib/db';

/**
 * Haversine formula to calculate distance between two coordinates in meters.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface GeofenceResult {
  allowed: boolean;
  message?: string;
}

/**
 * Validates if the given user coordinates are within the employee's geofence.
 * Checks:
 *   1. Employee-level geofence (geoEnabled + geoLatitude/geoLongitude/geoRadius)
 *   2. Department office location geofence (via DepartmentLocation -> OfficeLocation)
 * If no geofence is configured, access is always allowed.
 */
export async function validateGeofence(
  employeeId: string,
  userLat?: number,
  userLon?: number
): Promise<GeofenceResult> {
  // Look up employee with department info
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      geoEnabled: true,
      geoLatitude: true,
      geoLongitude: true,
      geoRadius: true,
      geoLocationName: true,
      departmentId: true,
    },
  });

  if (!employee) {
    return { allowed: false, message: 'Employee not found' };
  }

  // If geofence is not enabled for this employee, allow freely
  if (!employee.geoEnabled) {
    return { allowed: true };
  }

  // Geofence IS enabled — location is always required
  if (userLat == null || userLon == null) {
    return {
      allowed: false,
      message: 'Location is required. Please enable location access and try again.',
    };
  }

  // Check employee-level geofence first (personal coordinates)
  if (employee.geoLatitude != null && employee.geoLongitude != null) {
    const radiusMeters = (employee.geoRadius || 0.5) * 1000; // geoRadius is in km
    const distance = haversineDistance(userLat, userLon, employee.geoLatitude, employee.geoLongitude);
    if (distance > radiusMeters) {
      const locationName = employee.geoLocationName || 'assigned location';
      return {
        allowed: false,
        message: `You are ${Math.round(distance)}m away from ${locationName}. You must be within ${Math.round(radiusMeters)}m to clock in/out.`,
      };
    }
    return { allowed: true };
  }

  // No personal coordinates — check department office location geofence
  if (employee.departmentId) {
    const deptLocations = await prisma.departmentLocation.findMany({
      where: { departmentId: employee.departmentId },
      include: { officeLocation: true },
    });

    const activeLocations = deptLocations.filter(dl => dl.officeLocation.isActive);
    if (activeLocations.length > 0) {
      // Check if user is within ANY of the department's office locations
      for (const dl of activeLocations) {
        const loc = dl.officeLocation;
        const distance = haversineDistance(userLat, userLon, loc.latitude, loc.longitude);
        if (distance <= loc.radiusMeters) {
          return { allowed: true };
        }
      }

      const locationNames = activeLocations.map(dl => dl.officeLocation.name).join(', ');
      return {
        allowed: false,
        message: `You are not within any authorized office location (${locationNames}). Please go to your assigned office to clock in/out.`,
      };
    }
  }

  // geoEnabled is true but no coordinates set and no department office locations
  return {
    allowed: false,
    message: 'Geofence is enabled but no location has been configured for your account. Please contact your administrator to set up your geofence coordinates.',
  };
}
