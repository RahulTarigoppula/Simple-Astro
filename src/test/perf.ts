// Timing budgets in unit tests run beside many parallel workers (and on shared CI runners), so they
// assert the budget × SLACK: a 4× regression still fails, scheduler noise does not.
export const SLACK = Number(process.env.PERF_SLACK ?? 4);
