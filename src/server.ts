import dotenv from 'dotenv'
dotenv.config()

import app from './app'
import { connectDB } from './config/db'

const PORT = process.env.PORT ?? 4000

async function main() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`)
  })
}

main().catch(err => {
  console.error('Falha ao iniciar o servidor:', err)
  process.exit(1)
})
