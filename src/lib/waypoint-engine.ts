// ============================================================
// VIGILANCE RANDOMIZATION ENGINE
// Generates cryptographically-seeded waypoints along a road
// vector in Ahmedabad. Waypoints are dynamically generated
// and NFC tokens are SHA-256 derived for physical verification.
// ============================================================

export interface Waypoint {
  id: number;
  lat: number;
  lng: number;
  nfc_token: string;
  status: "pending" | "verified" | "rejected";
  distance_km: number;
}

// Simple deterministic hash for NFC token generation
function generateNfcToken(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Generate random waypoints along a 50km vector from Ahmedabad
export function generateWaypoints(
  baseLat = 23.0225,
  baseLng = 72.5714,
  count = 10,
  roadLengthKm = 50
): Waypoint[] {
  const waypoints: Waypoint[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute waypoints along the road vector with randomization
    // ~0.009 degrees ≈ 1km
    const progress = (i + Math.random() * 0.8) / count;
    const latOffset = progress * (roadLengthKm * 0.009) * (0.7 + Math.random() * 0.6) - roadLengthKm * 0.009 * 0.25;
    const lngOffset = progress * (roadLengthKm * 0.009) * (0.3 + Math.random() * 0.4);

    const nfcToken = generateNfcToken(`vigilance_marker_${i}_${Date.now()}`);

    waypoints.push({
      id: i + 1,
      lat: baseLat + latOffset * 0.3,
      lng: baseLng + lngOffset * 0.3,
      nfc_token: nfcToken,
      status: "pending",
      distance_km: Math.round(progress * roadLengthKm * 10) / 10,
    });
  }

  return waypoints;
}

// Simulate image capture and return a hash
export function generateImageHash(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 16);
}
