import { Router, Request, Response } from 'express'
import { Plan } from '../../models/Plan'
import { authMiddleware, requireRole } from '../../middleware/auth'


const router = Router()

// GET /api/v1/plans — lista planos ativos do tenant
router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const plans = await Plan.find({ tenantId, isActive: true }).sort({ priceMonthly: 1 }).lean()
  res.json(plans)
})

// GET /api/v1/plans/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const plan = await Plan.findOne({ _id: req.params.id, tenantId }).lean()
  if (!plan) { res.status(404).json({ error: 'Plano não encontrado' }); return }
  res.json(plan)
})

// POST /api/v1/plans — admin only
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const plan = await Plan.create({ ...req.body, tenantId })
  res.status(201).json(plan)
})

// PATCH /api/v1/plans/:id
router.patch('/:id', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    { $set: req.body },
    { new: true }
  )
  if (!plan) { res.status(404).json({ error: 'Plano não encontrado' }); return }
  res.json(plan)
})

// DELETE /api/v1/plans/:id — soft delete
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { tenantId } = req.tenant
  await Plan.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: { isActive: false } })
  res.status(204).send()
})

export default router
