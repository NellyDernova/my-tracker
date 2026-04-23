import { LocalRepository } from './LocalRepository'
import type { Repository } from './Repository'

export const repository: Repository = new LocalRepository()
export type { Repository } from './Repository'
