import { Schema, model, Document, Types } from 'mongoose'

export interface IPlan extends Document {
  tenantId: Types.ObjectId
  name: string
  description?: string
  priceMonthly: number
  currency: string
  features: string[]
  isActive: boolean
  wixId?: string
  createdAt: Date
  updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    priceMonthly: { type: Number, required: true },
    currency: { type: String, default: 'BRL' },
    features: [String],
    isActive: { type: Boolean, default: true },
    wixId: { type: String, sparse: true },
  },
  { timestamps: true }
)

export const Plan = model<IPlan>('Plan', PlanSchema)
