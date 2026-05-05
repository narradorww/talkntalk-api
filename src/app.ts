import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { tenantMiddleware } from './middleware/tenant'
import v1Routes from './routes/v1'

const app = express()

app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim())
app.use(cors({ origin: allowedOrigins, credentials: true }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Todas as rotas de negócio passam pelo tenant middleware
app.use('/api/v1', tenantMiddleware, v1Routes)

// Handler de erros global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

export default app
