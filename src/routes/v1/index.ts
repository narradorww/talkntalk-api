import { Router } from 'express'
import authRoutes from './auth'

const router = Router()

router.use('/auth', authRoutes)

// TODO: adicionar rotas conforme os módulos forem crescendo
// router.use('/users', usersRoutes)
// router.use('/plans', plansRoutes)
// router.use('/subjects', subjectsRoutes)
// router.use('/bookings', bookingsRoutes)
// router.use('/blog', blogRoutes)

export default router
