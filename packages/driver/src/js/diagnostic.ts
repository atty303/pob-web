export type DriverDiagnostic = {
  level?: "info" | "error";
  phase: "driver" | "worker" | "canvas" | "webgl" | "frame";
  event: string;
  data?: Record<string, unknown>;
};
