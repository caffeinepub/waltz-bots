/**
 * useSignals — re-exports from SignalScanContext for backward compatibility.
 * The actual scan logic lives in SignalScanContext.tsx.
 */
export type { LiveSignal } from "../context/SignalScanContext";
export {
  SCAN_SYMBOLS,
  COIN_NAMES,
  useSignalScan as useLiveSignals,
} from "../context/SignalScanContext";
