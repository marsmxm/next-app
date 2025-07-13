import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const entrepreneurs = await prisma.entrepreneur.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(entrepreneurs)
  } catch (error) {
    console.error('Error fetching entrepreneurs:', error)
    return NextResponse.json({ error: 'Failed to fetch entrepreneurs' }, { status: 500 })
  }
}
