import { randomInt, randomBytes, createHash } from 'crypto'

export const randInt = (min: number, max: number) => randomInt(min, max + 1)
export const rand01 = () => randomInt(0, 1_000_000) / 1_000_000
export const newServerSeed = () => randomBytes(32).toString('hex')
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')


