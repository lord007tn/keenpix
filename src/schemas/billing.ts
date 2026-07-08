import { z } from 'zod'

// Customer spending-cap setter. `null` clears the cap (unlimited overage);
// otherwise a non-negative cents amount, bounded to a sane ceiling ($100k) so a
// fat-fingered value can't disable the guard entirely.
export const spendCapSchema = z.object({
  spendCapCents: z.number().int().min(0).max(10_000_000).nullable(),
})
