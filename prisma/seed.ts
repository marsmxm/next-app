import prisma from '@/lib/prisma'

async function main() {
  // Clear existing data
  await prisma.appointment.deleteMany()
  await prisma.availableSlot.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.entrepreneur.deleteMany()

  // Create partners
  const partners = await Promise.all([
    prisma.partner.create({ data: { name: '合伙人 张三' } }),
    prisma.partner.create({ data: { name: '合伙人 李四' } }),
    prisma.partner.create({ data: { name: '合伙人 王五' } }),
  ])

  // Create entrepreneurs
  const entrepreneurs = await Promise.all([
    prisma.entrepreneur.create({ data: { name: '创业者 陈一' } }),
    prisma.entrepreneur.create({ data: { name: '创业者 赵二' } }),
    prisma.entrepreneur.create({ data: { name: '创业者 孙三' } }),
    prisma.entrepreneur.create({ data: { name: '创业者 周四' } }),
    prisma.entrepreneur.create({ data: { name: '创业者 吴五' } }),
  ])

  console.log('Database has been seeded!')
  console.log('Partners:', partners.length)
  console.log('Entrepreneurs:', entrepreneurs.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })