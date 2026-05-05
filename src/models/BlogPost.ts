import { Schema, model, Document, Types } from 'mongoose'

export interface IBlogPost extends Document {
  tenantId: Types.ObjectId
  title: string
  slug: string
  excerpt?: string
  content: string
  coverImageUrl?: string
  authorId?: Types.ObjectId
  categories: string[]
  publishedAt?: Date
  isPublished: boolean
  wixId?: string
  createdAt: Date
  updatedAt: Date
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    excerpt: String,
    content: { type: String, default: '' },
    coverImageUrl: String,
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    categories: [String],
    publishedAt: Date,
    isPublished: { type: Boolean, default: false },
    wixId: { type: String, sparse: true },
  },
  { timestamps: true }
)

BlogPostSchema.index({ tenantId: 1, slug: 1 }, { unique: true })

export const BlogPost = model<IBlogPost>('BlogPost', BlogPostSchema)
