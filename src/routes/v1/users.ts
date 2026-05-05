import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../../models/User'
import { authMiddleware, requireRole } from '../../middleware/auth'


const router = Router()

router.use(authMiddleware)

// GET /api/v1/users/me — perfil do usuário logado
router.get('/me', async (req: Request, res: Response) => {
  const r = req
  const user = await User.findById(r.userId).select('-passwordHash').lean()
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  res.json(user)
})

// PATCH /api/v1/users/me — atualiza próprio perfil
router.patch('/me', async (req: Request, res: Response) => {
  const r = req
  const { name, avatarUrl, password } = req.body

  const update: Record<string, unknown> = {}
  if (name) update.name = name
  if (avatarUrl) update.avatarUrl = avatarUrl
  if (password) update.passwordHash = await bcrypt.hash(password, 12)

  const user = await User.findByIdAndUpdate(r.userId, { $set: update }, { new: true }).select('-passwordHash')
  res.json(user)
})

// GET /api/v1/users — admin lista todos os usuários do tenant
router.get('/', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const r = req
  const { tenantId } = r.tenant
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Number(req.query.limit) || 20)
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { tenantId }
  if (req.query.role) filter.role = req.query.role
  if (req.query.search) {
    const re = new RegExp(req.query.search as string, 'i')
    filter.$or = [{ name: re }, { email: re }]
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ name: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ])

  res.json({ users, total, page, pages: Math.ceil(total / limit) })
})

// GET /api/v1/users/:id — admin busca usuário por id
router.get('/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const r = req
  const user = await User.findOne({ _id: req.params.id, tenantId: r.tenant.tenantId }).select('-passwordHash').lean()
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  res.json(user)
})

// PATCH /api/v1/users/:id — admin atualiza role/status de um usuário
router.patch('/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const r = req
  const { role, isActive } = req.body
  const update: Record<string, unknown> = {}
  if (role) update.role = role
  if (typeof isActive === 'boolean') update.isActive = isActive

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: r.tenant.tenantId },
    { $set: update },
    { new: true }
  ).select('-passwordHash')

  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  res.json(user)
})

export default router
