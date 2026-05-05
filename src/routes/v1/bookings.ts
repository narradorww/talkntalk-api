import { Router, Request, Response } from 'express'
import { Booking } from '../../models/Booking'
import { authMiddleware, requireRole } from '../../middleware/auth'


const router = Router()

// Todas as rotas de booking exigem autenticação
router.use(authMiddleware)

// GET /api/v1/bookings — lista bookings do usuário logado (ou todos se admin)
router.get('/', async (req: Request, res: Response) => {
  const r = req
  const { tenantId } = r.tenant

  const filter: Record<string, unknown> = { tenantId }
  // alunos só veem os próprios; admins/teachers veem todos
  if (!['admin', 'super_admin', 'teacher'].includes(r.userRole ?? '')) {
    filter.userId = r.userId
  }

  const { status, from, to } = req.query
  if (status) filter.status = status
  if (from) filter.startTime = { $gte: new Date(from as string) }
  if (to) filter.endTime = { ...(filter.endTime as object ?? {}), $lte: new Date(to as string) }

  const bookings = await Booking.find(filter).sort({ startTime: 1 }).lean()
  res.json(bookings)
})

// GET /api/v1/bookings/:id
router.get('/:id', async (req: Request, res: Response) => {
  const r = req
  const booking = await Booking.findOne({ _id: req.params.id, tenantId: r.tenant.tenantId }).lean()
  if (!booking) { res.status(404).json({ error: 'Booking não encontrado' }); return }

  // aluno só pode ver o próprio
  if (r.userRole === 'student' && String(booking.userId) !== r.userId) {
    res.status(403).json({ error: 'Acesso negado' }); return
  }
  res.json(booking)
})

// POST /api/v1/bookings — aluno cria um booking
router.post('/', async (req: Request, res: Response) => {
  const r = req
  const { tenantId } = r.tenant

  const booking = await Booking.create({
    ...req.body,
    tenantId,
    userId: r.userId,
    status: 'pending',
  })
  res.status(201).json(booking)
})

// PATCH /api/v1/bookings/:id/status — admin/teacher atualiza status
router.patch(
  '/:id/status',
  requireRole('admin', 'super_admin', 'teacher'),
  async (req: Request, res: Response) => {
    const r = req
    const { status } = req.body
    const allowed = ['pending', 'confirmed', 'cancelled', 'completed']
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${allowed.join(', ')}` }); return
    }
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, tenantId: r.tenant.tenantId },
      { $set: { status } },
      { new: true }
    )
    if (!booking) { res.status(404).json({ error: 'Booking não encontrado' }); return }
    res.json(booking)
  }
)

// DELETE /api/v1/bookings/:id — aluno cancela o próprio booking
router.delete('/:id', async (req: Request, res: Response) => {
  const r = req
  const booking = await Booking.findOne({ _id: req.params.id, tenantId: r.tenant.tenantId })
  if (!booking) { res.status(404).json({ error: 'Booking não encontrado' }); return }

  if (r.userRole === 'student' && String(booking.userId) !== r.userId) {
    res.status(403).json({ error: 'Acesso negado' }); return
  }

  booking.status = 'cancelled'
  await booking.save()
  res.json({ message: 'Booking cancelado' })
})

export default router
