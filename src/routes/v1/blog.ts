import { Router, Request, Response } from 'express'
import { BlogPost } from '../../models/BlogPost'
import { authMiddleware, requireRole } from '../../middleware/auth'


const router = Router()

// GET /api/v1/blog?page=1&limit=10&category=X
router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Number(req.query.limit) || 10)
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { tenantId, isPublished: true }
  if (req.query.category) filter.categories = req.query.category

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content') // não envia o body completo na listagem
      .lean(),
    BlogPost.countDocuments(filter),
  ])

  res.json({ posts, total, page, pages: Math.ceil(total / limit) })
})

// GET /api/v1/blog/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const post = await BlogPost.findOne({ slug: req.params.slug, tenantId, isPublished: true }).lean()
  if (!post) { res.status(404).json({ error: 'Post não encontrado' }); return }
  res.json(post)
})

// POST /api/v1/blog — admin/teacher
router.post('/', authMiddleware, requireRole('admin', 'super_admin', 'teacher'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const post = await BlogPost.create({ ...req.body, tenantId })
  res.status(201).json(post)
})

// PATCH /api/v1/blog/:id
router.patch('/:id', authMiddleware, requireRole('admin', 'super_admin', 'teacher'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const post = await BlogPost.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    { $set: req.body },
    { new: true }
  )
  if (!post) { res.status(404).json({ error: 'Post não encontrado' }); return }
  res.json(post)
})

// DELETE /api/v1/blog/:id — soft delete via isPublished
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  await BlogPost.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: { isPublished: false } })
  res.status(204).send()
})

export default router
