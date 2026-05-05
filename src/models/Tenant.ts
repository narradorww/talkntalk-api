import { Schema, model, Document } from 'mongoose'

export interface ITenant extends Document {
  name: string
  slug: string
  domain?: string
  logoUrl?: string
  primaryColor?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    domain: { type: String, sparse: true },
    logoUrl: String,
    primaryColor: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Tenant = model<ITenant>('Tenant', TenantSchema)
