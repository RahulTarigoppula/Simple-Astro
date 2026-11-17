/// <reference lib="webworker" />
// The background side of `compute()`: runs one named job per message and posts its plain result back.
import { type Args, type JobName, type Result, runJob } from "./jobs";

export interface ComputeRequest {
  id: number;
  job: JobName;
  args: Args<JobName>;
}

export type ComputeReply = { id: number; ok: true; value: Result<JobName> } | { id: number; ok: false; reason: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const { id, job, args } = e.data;
  let reply: ComputeReply;
  try {
    reply = { id, ok: true, value: runJob(job, args) };
  } catch (err) {
    reply = { id, ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
  try {
    scope.postMessage(reply);
  } catch {
    // a result that cannot be cloned: the page runs the job itself
    scope.postMessage({ id, ok: false, reason: "unclonable" } satisfies ComputeReply);
  }
};
