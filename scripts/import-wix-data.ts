/**
 * Script de importação dos dados exportados do Wix para MongoDB.
 *
 * Uso:
 *   WIX_EXPORT_DIR=../TalkinTalk/wix-export \
 *   MONGO_URI=mongodb://localhost:27017/talkntalk \
 *   npx ts-node scripts/import-wix-data.ts
 *
 * O script é idempotente: usa wixId como chave de upsert,
 * portanto pode ser rodado múltiplas vezes sem duplicar dados.
 */

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { Tenant, ITenant } from '../src/models/Tenant'
import { User } from '../src/models/User'
import { Plan } from '../src/models/Plan'
import { Subject } from '../src/models/Subject'
import { BlogPost } from '../src/models/BlogPost'

// ─── helpers ────────────────────────────────────────────────────────────────

const EXPORT_DIR = process.env.WIX_EXPORT_DIR
  ? path.resolve(process.env.WIX_EXPORT_DIR)
  : path.resolve(__dirname, '../../TalkinTalk/wix-export')

function readJson<T>(filename: string): T[] {
  const file = path.join(EXPORT_DIR, filename)
  if (!fs.existsSync(file)) {
    console.warn(`  [aviso] arquivo não encontrado: ${file}`)
    return []
  }
  const raw = fs.readFileSync(file, 'utf-8').trim()
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

let imported = 0
let skipped = 0

async function upsert<T extends mongoose.Document>(
  Model: mongoose.Model<T>,
  filter: Record<string, unknown>,
  data: Record<string, unknown>
) {
  const result = await Model.updateOne(filter, { $set: data }, { upsert: true })
  if (result.upsertedCount) imported++
  else skipped++
}

// ─── importadores ───────────────────────────────────────────────────────────

async function importPlans(tenantId: string) {
  console.log('\n📦 Importando plans...')
  const plans = readJson<any>('plans.json')

  for (const p of plans) {
    const priceValue = parseFloat(p.pricing?.price?.value ?? '0')
    await upsert(
      Plan,
      { wixId: p.id },
      {
        tenantId,
        name: p.name ?? 'Sem nome',
        description: p.description ?? '',
        priceMonthly: priceValue,
        currency: p.pricing?.price?.currency ?? 'BRL',
        features: p.perks?.values ?? [],
        isActive: !p.archived,
        wixId: p.id,
      }
    )
  }
  console.log(`  ✓ ${plans.length} plans processados`)
}

async function importSubjects(tenantId: string) {
  console.log('\n📚 Importando subjects (cms_subjects)...')
  const items = readJson<any>('cms_subjects.json')

  for (const item of items) {
    const d = item.data ?? {}
    const title: string = d.title ?? d.name ?? item.id
    const slug = slugify(title) || item.id

    await upsert(
      Subject,
      { wixId: item.id },
      {
        tenantId,
        title,
        slug,
        coverImageUrl: d.image?.url ?? d.coverImage ?? undefined,
        language: d.language ?? 'pt',
        isActive: true,
        wixId: item.id,
      }
    )
  }
  console.log(`  ✓ ${items.length} subjects processados`)
}

async function importBlogPosts(tenantId: string) {
  console.log('\n📝 Importando blog posts...')
  const posts = readJson<any>('blog_posts.json')
  const categories = readJson<any>('blog_categories.json')

  // mapa id → label para enriquecer os posts
  const catMap: Record<string, string> = {}
  for (const c of categories) catMap[c.id] = c.label ?? c.title ?? ''

  for (const post of posts) {
    const categoryNames = (post.categoryIds ?? []).map((id: string) => catMap[id]).filter(Boolean)
    const rawSlug = post.slug ?? slugify(post.title ?? post.id)

    await upsert(
      BlogPost,
      { wixId: post.id },
      {
        tenantId,
        title: post.title ?? 'Sem título',
        slug: rawSlug,
        excerpt: post.excerpt ?? undefined,
        coverImageUrl: post.coverImage?.url ?? undefined,
        categories: categoryNames,
        publishedAt: post.firstPublishedDate ? new Date(post.firstPublishedDate) : undefined,
        isPublished: !!post.firstPublishedDate,
        content: '',  // o corpo do post não estava no export; pode ser enriquecido depois
        wixId: post.id,
      }
    )
  }
  console.log(`  ✓ ${posts.length} posts processados`)
}

async function importMembers(tenantId: string) {
  console.log('\n👥 Importando members como users...')
  const members = readJson<any>('members.json')
  const contacts = readJson<any>('contacts.json')

  // mapa contactId → info de contato (email, nome)
  const contactMap: Record<string, any> = {}
  for (const c of contacts) contactMap[c.id] = c

  const defaultPasswordHash = await bcrypt.hash('TalkinTalk@2026!', 12)
  let count = 0

  for (const m of members) {
    const contact = contactMap[m.contactId] ?? {}
    const email =
      m.loginEmail ??
      contact.primaryInfo?.email ??
      contact.primaryEmail?.email ??
      `sem-email-${m.id}@talkntalk.com`

    const firstName = contact.info?.name?.first ?? m.profile?.nickname ?? 'Usuário'
    const lastName = contact.info?.name?.last ?? ''
    const name = `${firstName} ${lastName}`.trim()

    const avatarUrl = m.profile?.photo?.url ?? undefined

    await upsert(
      User,
      { tenantId, email: email.toLowerCase() },
      {
        tenantId,
        email: email.toLowerCase(),
        passwordHash: defaultPasswordHash,
        name,
        role: 'student',
        avatarUrl,
        isActive: m.activityStatus === 'ACTIVE' || m.status === 'APPROVED',
        wixId: m.id,
      }
    )
    count++
  }
  console.log(`  ✓ ${count} members importados como users`)
  console.log('  ⚠️  Senha padrão definida: TalkinTalk@2026! — solicite redefinição no primeiro acesso')
}

async function importStaff(tenantId: string) {
  console.log('\n🧑‍🏫 Importando staff como users (role=teacher)...')
  const staff = readJson<any>('staff.json')

  const defaultPasswordHash = await bcrypt.hash('TalkinTalk@2026!', 12)
  let count = 0

  for (const s of staff) {
    if (!s.email) continue

    // Extrai campos do campo description (JSON embutido no Wix)
    let extraData: any = {}
    try { extraData = JSON.parse(s.description ?? '{}') } catch {}

    const isActive = extraData.status === '1'

    await upsert(
      User,
      { tenantId, email: s.email.toLowerCase() },
      {
        tenantId,
        email: s.email.toLowerCase(),
        passwordHash: defaultPasswordHash,
        name: s.name ?? 'Professor',
        role: 'teacher',
        isActive,
        wixId: s.id,
      }
    )
    count++
  }
  console.log(`  ✓ ${count} staff importados como users (teacher)`)
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI não definida no .env')

  console.log('🔌 Conectando ao MongoDB...')
  await mongoose.connect(mongoUri)
  console.log(`  ✓ Conectado: ${mongoose.connection.host}`)

  console.log('\n🏢 Criando/verificando tenant TalkinTalk...')
  let tenant = await Tenant.findOne({ slug: 'talkntalk' })
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'TalkinTalk',
      slug: 'talkntalk',
      domain: 'talkntalk.com.br',
      isActive: true,
    })
    console.log('  ✓ Tenant criado')
  } else {
    console.log('  ✓ Tenant já existe, reutilizando')
  }

  const tenantId = String(tenant._id)

  await importPlans(tenantId)
  await importSubjects(tenantId)
  await importBlogPosts(tenantId)
  await importMembers(tenantId)
  await importStaff(tenantId)

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Importação concluída`)
  console.log(`   Inseridos: ${imported}`)
  console.log(`   Já existiam (atualizados): ${skipped}`)
  console.log('─────────────────────────────────────────\n')

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('\n❌ Erro na importação:', err)
  process.exit(1)
})
