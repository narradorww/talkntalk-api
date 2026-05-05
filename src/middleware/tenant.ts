import { Request, Response, NextFunction } from 'express'
import { Tenant } from '../models/Tenant'
import { AuthenticatedRequest } from '../types'

/**
 * Resolve o tenant a partir do header X-Tenant-Slug ou do subdomínio.
 * Injeta req.tenant em todas as requisições subsequentes.
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const r = req as AuthenticatedRequest

  // 1. Header explícito (útil para desenvolvimento e apps mobile)
  let slug = req.headers['x-tenant-slug'] as string | undefined

  // 2. Subdomínio (ex: escola1.talkntalk.com → slug = "escola1")
  if (!slug) {
    const host = req.headers.host ?? ''
    const parts = host.split('.')
    if (parts.length >= 3) slug = parts[0]
  }

  if (!slug) {
    res.status(400).json({ error: 'Tenant não identificado' })
    return
  }

  const tenant = await Tenant.findOne({ slug, isActive: true }).lean()
  if (!tenant) {
    res.status(404).json({ error: 'Tenant não encontrado' })
    return
  }

  r.tenant = { tenantId: String(tenant._id), tenantSlug: tenant.slug }
  next()
}
