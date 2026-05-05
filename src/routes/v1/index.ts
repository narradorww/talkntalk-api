import { Router } from 'express'
import authRoutes from './auth'
import plansRoutes from './plans'
import subjectsRoutes from './subjects'
import blogRoutes from './blog'
import bookingsRoutes from './bookings'
import usersRoutes from './users'

const router = Router()

router.use('/auth', authRoutes)
router.use('/plans', plansRoutes)
router.use('/subjects', subjectsRoutes)
router.use('/blog', blogRoutes)
router.use('/bookings', bookingsRoutes)
router.use('/users', usersRoutes)

export default router
