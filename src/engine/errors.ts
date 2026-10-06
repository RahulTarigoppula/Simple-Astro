export type EngineErrorCode =
  | "TIME_INVALID" // 31 February, or a local time that does not exist in that zone
  | "TIME_AMBIGUOUS" // a repeated local hour
  | "PLACE_MISSING"
  | "VARGA_UNSUPPORTED"
  | "EPHEMERIS_RANGE" // outside 1600-2400, where astronomy-engine degrades
  | "ORACLE_MISMATCH"; // dev-only: a golden fixture disagreed

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly detail: string;
  constructor(code: EngineErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EngineError";
    this.code = code;
    this.detail = detail;
  }
}
