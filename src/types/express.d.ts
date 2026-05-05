import { TenantContext } from './index'

declare global {
  namespace Express {
    interface Request {
      tenant: TenantContext
      userId?: string
      userRole?: string
    }
  }
}
