import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../../models/User'
import { AuthenticatedRequest } from '../../types'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const r = req as AuthenticatedRequest
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha obrigatórios' })
    return
  }

  const user = await User.findOne({ email: email.toLowerCase(), tenantId: r.tenant.tenantId })
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}${'s'|'m'|'h'|'d'|'w'}`
  const token = jwt.sign(
    { userId: user.id, tenantId: r.tenant.tenantId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn }
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

export default router
