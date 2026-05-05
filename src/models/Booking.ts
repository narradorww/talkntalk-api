import { Schema, model, Document, Types } from 'mongoose'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface IBooking extends Document {
  tenantId: Types.ObjectId
  userId: Types.ObjectId
  serviceId: string
  serviceName: string
  staffId?: string
  startTime: Date
  endTime: Date
  status: BookingStatus
  notes?: string
  wixId?: string
  createdAt: Date
  updatedAt: Date
}

const BookingSchema = new Schema<IBooking>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    staffId: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    notes: String,
    wixId: { type: String, sparse: true },
  },
  { timestamps: true }
)

export const Booking = model<IBooking>('Booking', BookingSchema)
