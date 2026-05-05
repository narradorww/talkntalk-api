import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../../models/User'
import { AuthenticatedRequest } from '../../types'

const router = Router()

router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha obrigatórios' })
    return
  }

  const user = await User.findOne({ email: email.toLowerCase(), tenantId: req.tenant.tenantId })
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: req.tenant.tenantId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

export default router
