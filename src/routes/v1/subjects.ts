import { Router, Request, Response } from 'express'
import { Subject } from '../../models/Subject'
import { authMiddleware, requireRole } from '../../middleware/auth'


const router = Router()

// GET /api/v1/subjects
router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const { lang } = req.query
  const filter: Record<string, unknown> = { tenantId, isActive: true }
  if (lang) filter.language = lang
  const subjects = await Subject.find(filter).sort({ title: 1 }).lean()
  res.json(subjects)
})

// GET /api/v1/subjects/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const subject = await Subject.findOne({ slug: req.params.slug, tenantId }).lean()
  if (!subject) { res.status(404).json({ error: 'Assunto não encontrado' }); return }
  res.json(subject)
})

// POST /api/v1/subjects
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const subject = await Subject.create({ ...req.body, tenantId })
  res.status(201).json(subject)
})

// PATCH /api/v1/subjects/:id
router.patch('/:id', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    { $set: req.body },
    { new: true }
  )
  if (!subject) { res.status(404).json({ error: 'Assunto não encontrado' }); return }
  res.json(subject)
})

export default router
