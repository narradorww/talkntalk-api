import { Request } from 'express'

export interface TenantContext {
  tenantId: string
  tenantSlug: string
}

export interface AuthenticatedRequest extends Request {
  tenant: TenantContext
  userId?: string
  userRole?: string
}
