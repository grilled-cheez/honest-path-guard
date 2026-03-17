import { useState, useCallback } from "react";
import { Shield, Terminal, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import FieldTerminal from "@/components/FieldTerminal";
import CommandCenter from "@/components/CommandCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { generateWaypoints, Waypoint } from "@/lib/waypoint-engine";
import { createGenesisBlock, Block } from "@/lib/blockchain";

type Role = "SELECT" | "FIELD_TERMINAL" | "COMMAND_CENTER";

interface PolicyViolation {
  timestamp: number;
  waypointId: number;
  message: string;
}

const Index = () => {
  const [role, setRole] = useState<Role>("SELECT");
  const [waypoints] = useState<Waypoint[]>(() => generateWaypoints());
  const [chain, setChain] = useState<Block[]>(() => [createGenesisBlock()]);
  const [currentStep, setCurrentStep] = useState(0);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);

  const handleInspectionComplete = useCallback(
    (block: Block, waypoint: Waypoint) => {
      setChain((prev) => [...prev, block]);
      setCurrentStep((prev) => prev + 1);
    },
    []
  );

  const handlePolicyViolation = useCallback(
    (message: string, waypointId: number) => {
      setViolations((prev) => [
        { timestamp: Date.now(), waypointId, message },
        ...prev,
      ]);
    },
    []
  );

  if (role === "SELECT") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center terminal-grid relative">
        <div className="absolute inset-0 scanline" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center space-y-8 p-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-verified" />
            <h1 className="font-mono text-2xl lg:text-3xl font-bold tracking-[0.2em]">
              VIGILANCE
            </h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest max-w-md">
            ZERO-TRUST ROAD INSPECTION SYSTEM — SELECT ACCESS LEVEL
          </p>

          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <button
              onClick={() => setRole("FIELD_TERMINAL")}
              className="group bg-card border border-border rounded p-6 text-left hover:border-primary transition-all hover:glow-verified"
            >
              <Terminal className="w-6 h-6 text-muted-foreground group-hover:text-verified transition-colors mb-4" />
              <h3 className="font-mono text-sm font-bold mb-2 tracking-wider">FIELD_WORKER</h3>
              <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                Step-by-step field workflow. NFC verification, GPS-locked camera, sequential waypoint progression.
              </p>
            </button>
            <button
              onClick={() => setRole("COMMAND_CENTER")}
              className="group bg-card border border-border rounded p-6 text-left hover:border-primary transition-all hover:glow-verified"
            >
              <Monitor className="w-6 h-6 text-muted-foreground group-hover:text-verified transition-colors mb-4" />
              <h3 className="font-mono text-sm font-bold mb-2 tracking-wider">OFFICER_DASHBOARD</h3>
              <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                Supervisor dashboard with GIS mapping, OPA rejection feed, blockchain audit trail, and visibility controls.
              </p>
            </button>
          </div>

          <div className="font-mono text-[10px] text-muted-foreground space-y-1">
            <p>OPA POLICY: ACTIVE | BLOCKCHAIN: {chain.length} BLOCKS | WAYPOINTS: {waypoints.length}</p>
            <p>WORKING HOURS: 09:00—17:00 IST | GPS TOLERANCE: 5m</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Nav bar */}
      <div className="flex items-center justify-between bg-card border-b border-border px-4 py-2">
        <button
          onClick={() => setRole("SELECT")}
          className="flex items-center gap-2 hover:text-verified transition-colors"
        >
          <Shield className="w-4 h-4 text-verified" />
          <span className="font-mono text-xs tracking-wider">VIGILANCE</span>
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setRole("FIELD_TERMINAL")}
            className={`font-mono text-[11px] px-3 py-1 rounded transition-colors ${role === "FIELD_TERMINAL" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            FIELD WORKER
          </button>
          <button
            onClick={() => setRole("COMMAND_CENTER")}
            className={`font-mono text-[11px] px-3 py-1 rounded transition-colors ${role === "COMMAND_CENTER" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            OFFICER DASHBOARD
          </button>
        </div>
      </div>

      {role === "FIELD_TERMINAL" ? (
        <FieldTerminal
          waypoints={waypoints}
          chain={chain}
          currentStep={currentStep}
          onInspectionComplete={handleInspectionComplete}
          onPolicyViolation={handlePolicyViolation}
        />
      ) : (
        <CommandCenter
          waypoints={waypoints}
          chain={chain}
          violations={violations}
        />
      )}
    </div>
  );
};

export default Index;
