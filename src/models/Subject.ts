import { Schema, model, Document, Types } from 'mongoose'

export interface ISubject extends Document {
  tenantId: Types.ObjectId
  title: string
  slug: string
  description?: string
  coverImageUrl?: string
  language: string
  isActive: boolean
  wixId?: string
  createdAt: Date
  updatedAt: Date
}

const SubjectSchema = new Schema<ISubject>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: String,
    coverImageUrl: String,
    language: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true },
    wixId: { type: String, sparse: true },
  },
  { timestamps: true }
)

SubjectSchema.index({ tenantId: 1, slug: 1 }, { unique: true })

export const Subject = model<ISubject>('Subject', SubjectSchema)
