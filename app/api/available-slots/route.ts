import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const availableSlots = await prisma.availableSlot.findMany({
      where: {
        date: startOfDay,
      },
      include: {
        partner: true
      }
    })
    
    return NextResponse.json(availableSlots)
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partnerId, date, startTime, action } = body

    if (!partnerId || !date || !startTime || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    if (action === 'toggle') {
      // Check if slot already exists
      const existingSlot = await prisma.availableSlot.findUnique({
        where: {
          partnerId_date_startTime: {
            partnerId,
            date: startOfDay,
            startTime
          }
        }
      })

      if (existingSlot) {
        // Delete the slot
        await prisma.availableSlot.delete({
          where: { id: existingSlot.id }
        })
        
        // Broadcast the update
        broadcastUpdate({
          type: 'slot_deleted',
          slot: existingSlot,
          date: date
        })
      } else {
        // Create new slot
        const newSlot = await prisma.availableSlot.create({
          data: {
            partnerId,
            date: startOfDay,
            startTime
          },
          include: {
            partner: true
          }
        })
        
        // Broadcast the update
        broadcastUpdate({
          type: 'slot_created',
          slot: newSlot,
          date: date
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error toggling available slot:', error)
    return NextResponse.json({ error: 'Failed to toggle available slot' }, { status: 500 })
  }
}
