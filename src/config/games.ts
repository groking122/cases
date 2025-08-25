export const MONTY = {
  id: "monty",
  cost: 100,
  payouts: { goat: 40, car: 196 },
  doors: 3,
} as const

export type MontyConfig = typeof MONTY


