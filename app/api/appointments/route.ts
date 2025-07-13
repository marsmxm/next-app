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

    const appointments = await prisma.appointment.findMany({
      where: {
        date: startOfDay,
      },
      include: {
        partner: true,
        entrepreneur: true
      }
    })
    
    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partnerId, entrepreneurId, date, startTime } = body

    if (!partnerId || !entrepreneurId || !date || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    // Check if the slot is available
    const availableSlot = await prisma.availableSlot.findUnique({
      where: {
        partnerId_date_startTime: {
          partnerId,
          date: startOfDay,
          startTime
        }
      }
    })

    if (!availableSlot) {
      return NextResponse.json({ error: '时间段不可用' }, { status: 400 })
    }

    // Check if there's already an appointment at this time
    const existingAppointment = await prisma.appointment.findUnique({
      where: {
        partnerId_date_startTime: {
          partnerId,
          date: startOfDay,
          startTime
        }
      }
    })

    if (existingAppointment) {
      return NextResponse.json({ error: '该时间段已被预约' }, { status: 400 })
    }

    // Check if entrepreneur already has an appointment at this time
    const entrepreneurConflict = await prisma.appointment.findUnique({
      where: {
        entrepreneurId_date_startTime: {
          entrepreneurId,
          date: startOfDay,
          startTime
        }
      }
    })

    if (entrepreneurConflict) {
      return NextResponse.json({ error: '您在该时间段已有其他预约' }, { status: 400 })
    }

    // Check if entrepreneur already has an appointment with this partner today
    const partnerConflict = await prisma.appointment.findUnique({
      where: {
        entrepreneurId_partnerId_date: {
          entrepreneurId,
          partnerId,
          date: startOfDay
        }
      }
    })

    if (partnerConflict) {
      return NextResponse.json({ error: '您今天已与该合伙人有预约' }, { status: 400 })
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        partnerId,
        entrepreneurId,
        date: startOfDay,
        startTime
      },
      include: {
        partner: true,
        entrepreneur: true
      }
    })

    // Broadcast the update to all connected clients
    broadcastUpdate({
      type: 'appointment_created',
      appointment,
      date: date
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
