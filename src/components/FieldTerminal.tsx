import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, MapPin, Nfc, Camera, CheckCircle2, XCircle, Navigation, Lock } from "lucide-react";
import { Waypoint, generateImageHash } from "@/lib/waypoint-engine";
import { evaluatePolicy } from "@/lib/opa-policy";
import { addBlock, Block, InspectionReport } from "@/lib/blockchain";

interface FieldTerminalProps {
  waypoints: Waypoint[];
  chain: Block[];
  currentStep: number;
  onInspectionComplete: (block: Block, waypoint: Waypoint) => void;
  onPolicyViolation: (violation: string, waypointId: number) => void;
}

const FieldTerminal = ({
  waypoints,
  chain,
  currentStep,
  onInspectionComplete,
  onPolicyViolation,
}: FieldTerminalProps) => {
  const [nfcInput, setNfcInput] = useState("");
  const [nfcVerified, setNfcVerified] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<InspectionReport["checklist"]>({
    paved_road_info: { street: false, type: false, annexed: false },
    road_surface_condition: {
      surface_defects: false,
      surface_deformation: false,
      cracks: false,
      patches_potholes: false,
      drainage: false,
    },
    vegetation: { vegetation_present: false, encroachment_overgrowth: false },
    rating: null,
  });

  const allComplete = currentStep >= waypoints.length;
  const target = allComplete ? null : waypoints[currentStep];

  const handleNfcScan = () => {
    if (!target) return;
    setError("");

    if (nfcInput.trim().toLowerCase() === target.nfc_token.toLowerCase()) {
      setNfcVerified(true);
      setError("");
    } else {
      setError("INVALID BADGE — ACCESS DENIED");
      setNfcVerified(false);
    }
  };

  const handleCameraCapture = () => {
    setCameraActive(true);
    setTimeout(() => {
      setPhotoTaken(true);
      setCameraActive(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!target || submitting) return;
    setSubmitting(true);

    const now = new Date();
    const policyInput = {
      assigned_gps: { lat: target.lat, lng: target.lng },
      submitted_gps: { lat: target.lat, lng: target.lng }, // Simulated perfect GPS match
      timestamp_hour: now.getHours(),
      checker_id: "INSP_082",
      nfc_verified: nfcVerified,
    };

    const result = evaluatePolicy(policyInput);

    if (!result.allow) {
      result.violations.forEach((v) => onPolicyViolation(v, target.id));
      setError(`OPA POLICY VIOLATION: ${result.violations[0]}`);
      setSubmitting(false);
      return;
    }

    try {
      const report: InspectionReport = {
        waypoint_id: target.id,
        assigned_gps: { lat: target.lat, lng: target.lng },
        submitted_gps: { lat: target.lat, lng: target.lng },
        checker_id: "INSP_082",
        nfc_token: target.nfc_token,
        image_hash: generateImageHash(),
        checklist,
        timestamp: Date.now(),
        timestamp_hour: now.getHours(),
      };

      const newBlock = addBlock(chain, report);
      target.status = "verified";
      onInspectionComplete(newBlock, target);

      // Reset for next waypoint
      setNfcInput("");
      setNfcVerified(false);
      setPhotoTaken(false);
      setChecklist({
        paved_road_info: { street: false, type: false, annexed: false },
        road_surface_condition: {
          surface_defects: false,
          surface_deformation: false,
          cracks: false,
          patches_potholes: false,
          drainage: false,
        },
        vegetation: { vegetation_present: false, encroachment_overgrowth: false },
        rating: null,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }

    setSubmitting(false);
  };

  if (allComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-verified" />
        </motion.div>
        <h2 className="font-mono text-xl text-verified">ALL WAYPOINTS VERIFIED</h2>
        <p className="font-mono text-sm text-muted-foreground">SESSION LOCKED — {chain.length - 1} BLOCKS COMMITTED</p>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="font-mono text-xs">TERMINAL SECURED</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-verified" />
          <span className="font-mono text-sm font-semibold tracking-wider">FIELD_WORKER_v1.0</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {currentStep + 1}/{waypoints.length}
        </span>
      </div>

      {/* Checklist (stored on-chain) */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">ROAD INSPECTION CHECKLIST</span>
          <span className="font-mono text-[10px] text-muted-foreground">ON-CHAIN</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-secondary rounded p-3 space-y-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">PAVED ROAD INFO</span>
            <label className="flex items-center gap-2 font-mono text-[11px]">
              <input
                type="checkbox"
                checked={checklist.paved_road_info.street}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    paved_road_info: { ...prev.paved_road_info, street: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <span>Street</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-[11px]">
              <input
                type="checkbox"
                checked={checklist.paved_road_info.type}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    paved_road_info: { ...prev.paved_road_info, type: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <span>Type</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-[11px]">
              <input
                type="checkbox"
                checked={checklist.paved_road_info.annexed}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    paved_road_info: { ...prev.paved_road_info, annexed: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <span>Annexed</span>
            </label>
          </div>

          <div className="bg-secondary rounded p-3 space-y-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">VEGETATION</span>
            <label className="flex items-center gap-2 font-mono text-[11px]">
              <input
                type="checkbox"
                checked={checklist.vegetation.vegetation_present}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    vegetation: { ...prev.vegetation, vegetation_present: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <span>Vegetation present</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-[11px]">
              <input
                type="checkbox"
                checked={checklist.vegetation.encroachment_overgrowth}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    vegetation: { ...prev.vegetation, encroachment_overgrowth: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <span>Encroachment / overgrowth</span>
            </label>
          </div>

          <div className="bg-secondary rounded p-3 space-y-2 sm:col-span-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">ROAD SURFACE CONDITION</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={checklist.road_surface_condition.surface_defects}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      road_surface_condition: {
                        ...prev.road_surface_condition,
                        surface_defects: e.target.checked,
                      },
                    }))
                  }
                  className="accent-primary"
                />
                <span>Surface defects</span>
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={checklist.road_surface_condition.surface_deformation}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      road_surface_condition: {
                        ...prev.road_surface_condition,
                        surface_deformation: e.target.checked,
                      },
                    }))
                  }
                  className="accent-primary"
                />
                <span>Surface deformation</span>
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={checklist.road_surface_condition.cracks}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      road_surface_condition: {
                        ...prev.road_surface_condition,
                        cracks: e.target.checked,
                      },
                    }))
                  }
                  className="accent-primary"
                />
                <span>Cracks</span>
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={checklist.road_surface_condition.patches_potholes}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      road_surface_condition: {
                        ...prev.road_surface_condition,
                        patches_potholes: e.target.checked,
                      },
                    }))
                  }
                  className="accent-primary"
                />
                <span>Patches & potholes</span>
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={checklist.road_surface_condition.drainage}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      road_surface_condition: {
                        ...prev.road_surface_condition,
                        drainage: e.target.checked,
                      },
                    }))
                  }
                  className="accent-primary"
                />
                <span>Drainage</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded p-3">
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest block mb-2">RATING SCALE</span>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setChecklist((prev) => ({ ...prev, rating: n }))}
                className={`rounded border px-2 py-2 font-mono text-xs transition-colors ${
                  checklist.rating === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"
                }`}
                aria-pressed={checklist.rating === n}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Selected:{" "}
            <span className="text-foreground">
              {checklist.rating === null ? "—" : checklist.rating}
            </span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-secondary rounded-sm overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep) / waypoints.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Objective */}
      <AnimatePresence mode="wait">
        <motion.div
          key={target!.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className="bg-card border border-border rounded p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-verified animate-pulse-glow" />
              <span className="font-mono text-xs text-muted-foreground tracking-widest">OBJECTIVE</span>
            </div>
            <h3 className="font-mono text-lg font-bold">WAYPOINT {target!.id}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary rounded p-3">
                <span className="font-mono text-[10px] text-muted-foreground block mb-1">TARGET LAT</span>
                <span className="font-mono text-sm text-verified">{target!.lat.toFixed(6)}</span>
              </div>
              <div className="bg-secondary rounded p-3">
                <span className="font-mono text-[10px] text-muted-foreground block mb-1">TARGET LNG</span>
                <span className="font-mono text-sm text-verified">{target!.lng.toFixed(6)}</span>
              </div>
            </div>
            <div className="bg-secondary rounded p-3">
              <span className="font-mono text-[10px] text-muted-foreground block mb-1">DISTANCE</span>
              <span className="font-mono text-sm">{target!.distance_km} km</span>
            </div>
          </div>

          {/* Step 1: NFC Scan */}
          <div className={`bg-card border rounded p-4 space-y-3 transition-colors ${nfcVerified ? "border-verified glow-verified" : "border-border"}`}>
            <div className="flex items-center gap-2">
              <Nfc className={`w-4 h-4 ${nfcVerified ? "text-verified" : "text-muted-foreground"}`} />
              <span className="font-mono text-xs tracking-widest">STEP 1: NFC PHYSICAL VERIFICATION</span>
              {nfcVerified && <CheckCircle2 className="w-4 h-4 text-verified ml-auto" />}
            </div>
            {!nfcVerified ? (
              <>
                <p className="font-mono text-xs text-muted-foreground">
                  SCAN THE PHYSICAL NFC TAG AT KILOMETER MARKER
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nfcInput}
                    onChange={(e) => setNfcInput(e.target.value)}
                    placeholder="CRYPTOGRAPHIC BADGE"
                    className="flex-1 bg-secondary border border-border rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    onKeyDown={(e) => e.key === "Enter" && handleNfcScan()}
                  />
                  <button
                    onClick={handleNfcScan}
                    className="bg-secondary border border-border rounded px-4 py-2 font-mono text-xs hover:border-primary transition-colors"
                  >
                    VERIFY
                  </button>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  TOKEN: <span className="text-verified select-all">{target!.nfc_token}</span>
                </p>
              </>
            ) : (
              <p className="font-mono text-xs text-verified">✓ BADGE AUTHENTICATED</p>
            )}
          </div>

          {/* Step 2: Camera (locked until NFC verified) */}
          <div className={`bg-card border rounded p-4 space-y-3 transition-colors ${!nfcVerified ? "opacity-40" : photoTaken ? "border-verified glow-verified" : "border-border"}`}>
            <div className="flex items-center gap-2">
              <Camera className={`w-4 h-4 ${photoTaken ? "text-verified" : "text-muted-foreground"}`} />
              <span className="font-mono text-xs tracking-widest">STEP 2: CAPTURE INSPECTION PHOTO</span>
              {photoTaken && <CheckCircle2 className="w-4 h-4 text-verified ml-auto" />}
              {!nfcVerified && <Lock className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            {nfcVerified && !photoTaken && (
              <>
                <p className="font-mono text-xs text-muted-foreground">
                  CAMERA UNLOCKED — NO GALLERY UPLOADS PERMITTED
                </p>
                <button
                  onClick={handleCameraCapture}
                  disabled={cameraActive}
                  className="w-full bg-secondary border border-border rounded px-4 py-3 font-mono text-xs hover:border-primary transition-colors disabled:opacity-50"
                >
                  {cameraActive ? "CAPTURING..." : "ACTIVATE CAMERA"}
                </button>
              </>
            )}
            {photoTaken && (
              <p className="font-mono text-xs text-verified">✓ PHOTO CAPTURED & HASHED</p>
            )}
          </div>

          {/* Step 3: Submit */}
          <div className={`bg-card border rounded p-4 space-y-3 ${!(nfcVerified && photoTaken) ? "opacity-40" : "border-border"}`}>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-xs tracking-widest">STEP 3: SUBMIT INSPECTION</span>
              {!(nfcVerified && photoTaken) && <Lock className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            {nfcVerified && photoTaken && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground rounded px-4 py-3 font-mono text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "SUBMITTING TO LEDGER..." : "COMMIT TO BLOCKCHAIN"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive rounded p-3 flex items-center gap-2"
        >
          <XCircle className="w-4 h-4 text-rejected" />
          <span className="font-mono text-xs text-rejected">{error}</span>
        </motion.div>
      )}
    </div>
  );
};

export default FieldTerminal;
