import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  Link2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Block, verifyChain, InspectionReport } from "@/lib/blockchain";
import { Waypoint } from "@/lib/waypoint-engine";
import GISMap from "./GISMap";

interface PolicyViolation {
  timestamp: number;
  waypointId: number;
  message: string;
}

interface CommandCenterProps {
  waypoints: Waypoint[];
  chain: Block[];
  violations: PolicyViolation[];
}

const CommandCenter = ({ waypoints, chain, violations }: CommandCenterProps) => {
  const [showGps, setShowGps] = useState(true);
  const [showInspectorIds, setShowInspectorIds] = useState(true);
  const [showRawHashes, setShowRawHashes] = useState(false);

  const chainIntegrity = verifyChain(chain);
  const verifiedCount = waypoints.filter((w) => w.status === "verified").length;
  const rejectedCount = waypoints.filter((w) => w.status === "rejected").length;
  const pendingCount = waypoints.filter((w) => w.status === "pending").length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-verified" />
          <h1 className="font-mono text-lg font-bold tracking-wider">OFFICER_DASHBOARD</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${chainIntegrity.valid ? "bg-verified animate-pulse-glow" : "bg-rejected"}`} />
          <span className="font-mono text-xs text-muted-foreground">
            CHAIN: {chainIntegrity.valid ? "INTACT" : "COMPROMISED"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "VERIFIED", value: verifiedCount, color: "text-verified" },
          { label: "REJECTED", value: rejectedCount, color: "text-rejected" },
          { label: "PENDING", value: pendingCount, color: "text-pending" },
          { label: "BLOCKS", value: chain.length, color: "text-foreground" },
        ].map((m) => (
          <div key={m.label} className="bg-card border border-border rounded p-4">
            <span className="font-mono text-[10px] text-muted-foreground block mb-1">{m.label}</span>
            <span className={`font-mono text-2xl font-bold ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* GIS Map */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-xs tracking-widest">LIVE GIS MAPPING — AHMEDABAD SECTOR</span>
        </div>
        <GISMap waypoints={waypoints} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Blockchain Ledger */}
        <div className="lg:col-span-2 bg-card border border-border rounded">
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs tracking-widest">IMMUTABLE LEDGER AUDIT</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {[...chain].reverse().map((block) => {
              const isGenesis = typeof block.data === "string";
              const report = isGenesis ? null : (block.data as InspectionReport);
              return (
                <motion.div
                  key={block.index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-verified">BLOCK #{block.index}</span>
                      {isGenesis && (
                        <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">GENESIS</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {showRawHashes && (
                    <div className="space-y-1 mb-2">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        HASH: <span className="text-foreground">{block.hash.substring(0, 32)}...</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        PREV: <span className="text-foreground">{block.previousHash.substring(0, 32)}...</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        NONCE: <span className="text-foreground">{block.nonce}</span>
                      </div>
                    </div>
                  )}

                  {report && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="text-muted-foreground">
                        WP: <span className="text-foreground">{report.waypoint_id}</span>
                      </div>
                      {showInspectorIds && (
                        <div className="text-muted-foreground">
                          ID: <span className="text-foreground">{report.checker_id}</span>
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        RATING:{" "}
                        <span className="text-foreground">
                          {report.checklist?.rating ?? "—"}
                        </span>
                      </div>
                      {showGps && (
                        <>
                          <div className="text-muted-foreground">
                            LAT: <span className="text-foreground">{report.assigned_gps.lat.toFixed(4)}</span>
                          </div>
                          <div className="text-muted-foreground">
                            LNG: <span className="text-foreground">{report.assigned_gps.lng.toFixed(4)}</span>
                          </div>
                        </>
                      )}
                      <div className="text-muted-foreground">
                        IMG: <span className="text-foreground">{report.image_hash}</span>
                      </div>
                    </div>
                  )}

                  {isGenesis && (
                    <p className="font-mono text-[11px] text-muted-foreground">{block.data as string}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* OPA Rejection Feed */}
          <div className="bg-card border border-border rounded">
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <AlertTriangle className="w-4 h-4 text-rejected" />
              <span className="font-mono text-xs tracking-widest">OPA REJECTION FEED</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {violations.length === 0 ? (
                <div className="p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-verified mx-auto mb-2" />
                  <p className="font-mono text-xs text-muted-foreground">NO ANOMALIES DETECTED</p>
                </div>
              ) : (
                violations.map((v, i) => (
                  <div key={i} className="border-b border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-3 h-3 text-rejected" />
                      <span className="font-mono text-[10px] text-rejected">WP-{v.waypointId}</span>
                      <span className="font-mono text-[10px] text-muted-foreground ml-auto">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">{v.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Visibility Filters */}
          <div className="bg-card border border-border rounded">
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-xs tracking-widest">VISIBILITY FILTERS</span>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: "GPS COORDINATES", value: showGps, set: setShowGps },
                { label: "INSPECTOR IDS", value: showInspectorIds, set: setShowInspectorIds },
                { label: "RAW HASHES", value: showRawHashes, set: setShowRawHashes },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => f.set(!f.value)}
                  className="w-full flex items-center justify-between bg-secondary rounded px-3 py-2 hover:bg-secondary/80 transition-colors"
                >
                  <span className="font-mono text-xs">{f.label}</span>
                  {f.value ? (
                    <Eye className="w-3 h-3 text-verified" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chain Integrity */}
          <div className={`border rounded p-4 ${chainIntegrity.valid ? "bg-primary/5 border-verified" : "bg-destructive/5 border-destructive"}`}>
            <div className="flex items-center gap-2 mb-2">
              {chainIntegrity.valid ? (
                <CheckCircle2 className="w-4 h-4 text-verified" />
              ) : (
                <XCircle className="w-4 h-4 text-rejected" />
              )}
              <span className="font-mono text-xs font-bold">
                {chainIntegrity.valid ? "CHAIN INTEGRITY VERIFIED" : "CHAIN COMPROMISED"}
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {chainIntegrity.valid
                ? `${chain.length} blocks verified. No tampering detected.`
                : `Chain broken at block #${chainIntegrity.brokenAt}. Possible DBA manipulation.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
