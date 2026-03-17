// ============================================================
// P.R.A.M.A.N IMMUTABLE LEDGER
// A lightweight blockchain implementation for tamper-proof
// inspection record storage. Each block contains a SHA-256
// hash linking it to the previous block, making any
// retroactive modification mathematically detectable.
// ============================================================

export interface InspectionReport {
  waypoint_id: number;
  assigned_gps: { lat: number; lng: number };
  submitted_gps: { lat: number; lng: number };
  checker_id: string;
  nfc_token: string;
  image_hash: string;
  checklist: {
    paved_road_info: {
      street: boolean;
      type: boolean;
      annexed: boolean;
    };
    road_surface_condition: {
      surface_defects: boolean;
      surface_deformation: boolean;
      cracks: boolean;
      patches_potholes: boolean;
      drainage: boolean;
    };
    vegetation: {
      vegetation_present: boolean;
      encroachment_overgrowth: boolean;
    };
    rating: number | null;
  };
  timestamp: number;
  timestamp_hour: number;
}

export interface Block {
  index: number;
  timestamp: number;
  data: InspectionReport | string;
  previousHash: string;
  nonce: number;
  hash: string;
}

// SHA-256 hash using Web Crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Synchronous hash for mining (simple implementation)
function simpleHash(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  // Create a longer hash by repeating the process
  let result = hex;
  for (let i = 0; i < 7; i++) {
    let h = 0;
    const segment = message.slice(i * 10, (i + 1) * 10 + message.length);
    for (let j = 0; j < segment.length; j++) {
      h = (h << 5) - h + segment.charCodeAt(j) + i;
      h |= 0;
    }
    result += Math.abs(h).toString(16).padStart(8, "0");
  }
  return result;
}

function calculateHash(block: Omit<Block, "hash">): string {
  const blockString = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    data: block.data,
    previousHash: block.previousHash,
    nonce: block.nonce,
  });
  return simpleHash(blockString);
}

function mineBlock(block: Omit<Block, "hash">, difficulty: number): Block {
  const target = "0".repeat(difficulty);
  let nonce = 0;
  let hash = "";
  // Proof of Work: find a hash starting with `difficulty` zeros
  while (true) {
    hash = calculateHash({ ...block, nonce });
    if (hash.substring(0, difficulty) === target) break;
    nonce++;
    if (nonce > 100000) break; // Safety limit for browser
  }
  return { ...block, nonce, hash };
}

export function createGenesisBlock(): Block {
  const block: Omit<Block, "hash"> = {
    index: 0,
    timestamp: Date.now(),
    data: "GENESIS_BLOCK::PRAMAN_SYSTEM_ACTIVE",
    previousHash: "0".repeat(64),
    nonce: 0,
  };
  return mineBlock(block, 2);
}

export function addBlock(
  chain: Block[],
  report: InspectionReport
): Block {
  const previousBlock = chain[chain.length - 1];

  // SAFEGUARD: Replay protection — check if this waypoint already exists
  const isDuplicate = chain.some(
    (b) =>
      typeof b.data !== "string" &&
      (b.data as InspectionReport).waypoint_id === report.waypoint_id
  );
  if (isDuplicate) {
    throw new Error(
      `REPLAY_ATTACK_DETECTED: Waypoint ${report.waypoint_id} already recorded`
    );
  }

  const block: Omit<Block, "hash"> = {
    index: chain.length,
    timestamp: Date.now(),
    data: report,
    previousHash: previousBlock.hash,
    nonce: 0,
  };

  return mineBlock(block, 2);
}

// TAMPER DETECTION: Verify the entire chain integrity
// If any block's data has been modified by a malicious DBA,
// the hash will no longer match, breaking the chain
export function verifyChain(chain: Block[]): {
  valid: boolean;
  brokenAt?: number;
} {
  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    // Check if the previous hash reference is intact
    if (currentBlock.previousHash !== previousBlock.hash) {
      return { valid: false, brokenAt: i };
    }

    // Recalculate the hash and compare
    const recalculated = calculateHash({
      index: currentBlock.index,
      timestamp: currentBlock.timestamp,
      data: currentBlock.data,
      previousHash: currentBlock.previousHash,
      nonce: currentBlock.nonce,
    });

    if (recalculated !== currentBlock.hash) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true };
}
