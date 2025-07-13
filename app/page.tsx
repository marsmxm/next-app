'use client'

import { useState, useEffect } from 'react'

// Types
interface Partner {
  id: string
  name: string
}

interface Entrepreneur {
  id: string
  name: string
}

interface AvailableSlot {
  id: string
  partnerId: string
  date: string
  startTime: string
  isBooked: boolean
}

interface Appointment {
  id: string
  partnerId: string
  entrepreneurId: string
  date: string
  startTime: string
  partner?: Partner
  entrepreneur?: Entrepreneur
}

export default function AppointmentSystem() {
  const [currentUser, setCurrentUser] = useState<'partner' | 'entrepreneur'>('partner')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [partners, setPartners] = useState<Partner[]>([])
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string>('')

  // Time slots: 9:00-17:00, every 15 minutes
  const timeSlots = []
  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeSlots.push(timeString)
    }
  }

  // Get available dates (today + 7 days)
  const availableDates = []
  for (let i = 0; i < 8; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    availableDates.push(date.toISOString().split('T')[0])
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [partnersRes, entrepreneursRes, slotsRes, appointmentsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/entrepreneurs'),
        fetch(`/api/available-slots?date=${selectedDate}`),
        fetch(`/api/appointments?date=${selectedDate}`)
      ])

      setPartners(await partnersRes.json())
      setEntrepreneurs(await entrepreneursRes.json())
      setAvailableSlots(await slotsRes.json())
      setAppointments(await appointmentsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailableSlot = async (partnerId: string, startTime: string) => {
    if (currentUser !== 'partner' || selectedUserId !== partnerId) return

    const loadingKey = `${partnerId}-${startTime}`
    setActionLoading(loadingKey)

    try {
      const response = await fetch('/api/available-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          date: selectedDate,
          startTime,
          action: 'toggle'
        })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error toggling slot:', error)
    } finally {
      setActionLoading('')
    }
  }

  const bookAppointment = async (partnerId: string, startTime: string) => {
    if (currentUser !== 'entrepreneur' || !selectedUserId) return

    const loadingKey = `${partnerId}-${startTime}`
    setActionLoading(loadingKey)

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          entrepreneurId: selectedUserId,
          date: selectedDate,
          startTime
        })
      })

      if (response.ok) {
        fetchData()
      } else {
        const error = await response.text()
        alert(`预约失败: ${error}`)
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      alert('预约失败，请重试')
    } finally {
      setActionLoading('')
    }
  }

  const cancelAppointment = async (appointmentId: string) => {
    setActionLoading(`cancel-${appointmentId}`)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error canceling appointment:', error)
    } finally {
      setActionLoading('')
    }
  }

  const getSlotStatus = (partnerId: string, startTime: string) => {
    const appointment = appointments.find(a => 
      a.partnerId === partnerId && a.startTime === startTime
    )
    
    if (appointment) {
      return { type: 'booked', appointment }
    }

    const availableSlot = availableSlots.find(s => 
      s.partnerId === partnerId && s.startTime === startTime
    )

    if (availableSlot) {
      return { type: 'available', slot: availableSlot }
    }

    return { type: 'unavailable' }
  }

  const canUserActOnSlot = (partnerId: string, startTime: string) => {
    if (currentUser === 'partner') {
      return selectedUserId === partnerId
    } else {
      const status = getSlotStatus(partnerId, startTime)
      if (status.type !== 'available') return false
      
      // Check if entrepreneur already has appointment at this time
      const hasConflict = appointments.some(a => 
        a.entrepreneurId === selectedUserId && a.startTime === startTime
      )
      
      // Check if entrepreneur already has appointment with this partner today
      const hasPartnerConflict = appointments.some(a => 
        a.entrepreneurId === selectedUserId && a.partnerId === partnerId
      )
      
      return !hasConflict && !hasPartnerConflict
    }
  }

  if (loading && !partners.length) {
    return <div className="text-center">加载中...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* User Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户类型
            </label>
            <select
              value={currentUser}
              onChange={(e) => {
                setCurrentUser(e.target.value as 'partner' | 'entrepreneur')
                setSelectedUserId('')
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="partner">合伙人</option>
              <option value="entrepreneur">创业者</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择{currentUser === 'partner' ? '合伙人' : '创业者'}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">请选择...</option>
              {(currentUser === 'partner' ? partners : entrepreneurs).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择日期
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      {selectedUserId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })} - 会面安排
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentUser === 'partner' 
                ? '点击时间段设置可用时间' 
                : '点击绿色时间段进行预约'
              }
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  {partners.map((partner) => (
                    <th key={partner.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {partner.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((time) => (
                  <tr key={time} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {time}
                    </td>
                    {partners.map((partner) => {
                      const status = getSlotStatus(partner.id, time)
                      const canAct = canUserActOnSlot(partner.id, time)
                      const isLoading = actionLoading === `${partner.id}-${time}`
                      
                      return (
                        <td key={partner.id} className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (currentUser === 'partner') {
                                toggleAvailableSlot(partner.id, time)
                              } else if (status.type === 'available' && canAct) {
                                bookAppointment(partner.id, time)
                              }
                            }}
                            disabled={(!canAct && currentUser === 'entrepreneur') || isLoading}
                            className={`
                              w-full px-3 py-2 rounded text-sm font-medium transition-colors relative
                              ${status.type === 'booked' 
                                ? 'bg-red-100 text-red-800 cursor-default' 
                                : status.type === 'available'
                                  ? canAct 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                                    : 'bg-green-50 text-green-600 cursor-not-allowed'
                                  : currentUser === 'partner' && selectedUserId === partner.id
                                    ? 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-800 cursor-pointer'
                                    : 'bg-gray-50 text-gray-400 cursor-default'
                              }
                              ${isLoading ? 'opacity-50' : ''}
                            `}
                          >
                            {isLoading ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                              </div>
                            ) : status.type === 'booked' ? (
                              <div className="text-center">
                                <div>已预约</div>
                                <div className="text-xs">
                                  {entrepreneurs.find(e => e.id === status.appointment?.entrepreneurId)?.name}
                                </div>
                                {(currentUser === 'partner' && selectedUserId === partner.id) ||
                                 (currentUser === 'entrepreneur' && selectedUserId === status.appointment?.entrepreneurId) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      cancelAppointment(status.appointment!.id)
                                    }}
                                    disabled={actionLoading === `cancel-${status.appointment!.id}`}
                                    className="mt-1 text-xs underline hover:text-red-900 disabled:opacity-50"
                                  >
                                    {actionLoading === `cancel-${status.appointment!.id}` ? (
                                      <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                                      </div>
                                    ) : (
                                      '取消'
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            ) : status.type === 'available' ? (
                              <div className="text-center">
                                空闲
                                {!canAct && currentUser === 'entrepreneur' && (
                                  <div className="text-xs mt-1">
                                    {appointments.some(a => a.entrepreneurId === selectedUserId && a.startTime === time)
                                      ? '时间冲突'
                                      : '今日已约'
                                    }
                                  </div>
                                )}
                              </div>
                            ) : (
                              '不可用'
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedUserId && (
        <div className="text-center text-gray-500 py-12">
          请先选择用户身份来查看和管理会面安排
        </div>
      )}
    </div>
  )
}
