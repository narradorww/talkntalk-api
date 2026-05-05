import { Schema, model, Document, Types } from 'mongoose'
import bcrypt from 'bcryptjs'

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin'

export interface IUser extends Document {
  tenantId: Types.ObjectId
  email: string
  passwordHash: string
  name: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  wixId?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(plain: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin', 'super_admin'], default: 'student' },
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    wixId: { type: String, sparse: true },
  },
  { timestamps: true }
)

// Garante email único por tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true })

UserSchema.methods.comparePassword = async function (plain: string) {
  return bcrypt.compare(plain, this.passwordHash)
}

export const User = model<IUser>('User', UserSchema)
