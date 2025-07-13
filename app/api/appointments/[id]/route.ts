import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { broadcastUpdate } from '../../events/route'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 })
    }

    // Get the appointment details before deleting for broadcasting
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        partner: true,
        entrepreneur: true
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await prisma.appointment.delete({
      where: { id }
    })

    const date = appointment.date;
    date.setHours(date.getHours() + 8)

    // Broadcast the update to all connected clients
    broadcastUpdate({
      type: 'appointment_deleted',
      appointment,
      date: date.toISOString().split('T')[0]
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
