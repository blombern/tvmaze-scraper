import mongoose from 'mongoose'

export interface UnusedProperties {
  [key: string]: any
}

export type ApiResponse = any

export interface CastMember {
  id: number
  name: string
  birthday: string | null
}

export interface ApiCastMember extends UnusedProperties {
  person: CastMember
}

export interface ApiShow extends UnusedProperties {
  id: number
  name: string
}

export interface Show {
  id: number
  name: string
  cast: CastMember[]
}

export type ShowModel = mongoose.Document & Show
