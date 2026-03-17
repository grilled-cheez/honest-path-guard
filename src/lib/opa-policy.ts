// ============================================================
// VIGILANCE OPA POLICY ENGINE (Client-side simulation)
// Implements the Zero-Trust inspection_policy.rego logic.
// In production, this runs on a separate OPA server.
// Every submission is validated BEFORE it touches the ledger.
// ============================================================

export interface PolicyInput {
  assigned_gps: { lat: number; lng: number };
  submitted_gps: { lat: number; lng: number };
  timestamp_hour: number;
  checker_id: string;
  nfc_verified: boolean;
}

export interface PolicyResult {
  allow: boolean;
  violations: string[];
  severity: "PASS" | "WARNING" | "CRITICAL";
}

// Constants matching inspection_policy.rego
const MAX_DISTANCE_METERS = 5;
const START_HOUR = 9;
const END_HOUR = 17;

// Haversine formula for GPS distance in meters
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Evaluate the OPA policy against an inspection payload
export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const violations: string[] = [];

  // RULE 1: GPS deviation check (5-meter tolerance)
  const distance = haversineDistance(
    input.assigned_gps.lat,
    input.assigned_gps.lng,
    input.submitted_gps.lat,
    input.submitted_gps.lng
  );

  if (distance > MAX_DISTANCE_METERS) {
    violations.push(
      `GPS_DEVIATION: ${distance.toFixed(1)}m from target (max ${MAX_DISTANCE_METERS}m)`
    );
  }

  // RULE 2: Working hours enforcement
  if (input.timestamp_hour < START_HOUR) {
    violations.push(
      `TEMPORAL_VIOLATION: Submission at ${input.timestamp_hour}:00 before ${START_HOUR}:00`
    );
  }
  if (input.timestamp_hour > END_HOUR) {
    violations.push(
      `TEMPORAL_VIOLATION: Submission at ${input.timestamp_hour}:00 after ${END_HOUR}:00`
    );
  }

  // RULE 3: NFC physical verification
  if (!input.nfc_verified) {
    violations.push("NFC_FAILURE: Physical badge not verified");
  }

  const allow = violations.length === 0;
  const severity = violations.length === 0
    ? "PASS"
    : violations.some((v) => v.includes("GPS_DEVIATION") || v.includes("NFC_FAILURE"))
    ? "CRITICAL"
    : "WARNING";

  return { allow, violations, severity };
}

// Generate the Rego policy file content (for display)
export const REGO_POLICY = `package vigilance.authz

import future.keywords.if

default allow = false

# Constants
MAX_DISTANCE_METERS := 5
START_HOUR := 9
END_HOUR := 17

allow if {
    not gps_deviation
    not outside_working_hours
    input.nfc_verified == true
}

gps_deviation if {
    abs(input.submitted_gps.lat - input.assigned_gps.lat) > 0.000045
}

gps_deviation if {
    abs(input.submitted_gps.lng - input.assigned_gps.lng) > 0.000045
}

outside_working_hours if {
    input.timestamp_hour < START_HOUR
}

outside_working_hours if {
    input.timestamp_hour > END_HOUR
}`;
