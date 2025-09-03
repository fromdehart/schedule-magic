import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from '../lib/icons'

interface DatePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}

export function DatePicker({ selectedDate, onDateChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate))
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update current month when selected date changes
  useEffect(() => {
    setCurrentMonth(new Date(selectedDate))
  }, [selectedDate])

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const generateCalendarDays = (date: Date) => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(date)
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month - create dates at noon to avoid timezone issues
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(date.getFullYear(), date.getMonth(), i, 12, 0, 0, 0)
      days.push(dayDate)
    }
    
    return days
  }

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  const isToday = (date: Date) => {
    return isSameDate(date, new Date())
  }



  const handleDateClick = (date: Date) => {
    // Create a new date object at noon to ensure consistent timezone handling
    const noonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
    
    onDateChange(noonDate)
    setIsOpen(false)
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const goToToday = () => {
    const today = new Date()
    onDateChange(today)
    setCurrentMonth(today)
    setIsOpen(false)
  }

  const calendarDays = generateCalendarDays(currentMonth)
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className={`relative ${className}`} ref={datePickerRef}>
      {/* Date Display Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {formatSelectedDate(selectedDate)}
        </span>

      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] max-w-[90vw] sm:max-w-none left-0 sm:right-0 sm:left-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Select Date</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => handleMonthChange('prev')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h4 className="text-sm font-medium text-gray-900">{monthName}</h4>
            <button
              onClick={() => handleMonthChange('next')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-gray-500 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => (
                <div key={index} className="h-8">
                  {date ? (
                    <button
                      onClick={() => handleDateClick(date)}
                      className={`w-full h-full rounded-md text-sm font-medium transition-colors ${
                        isSameDate(date, selectedDate)
                          ? 'bg-emerald-600 text-white'
                          : isToday(date)
                          ? 'bg-blue-100 text-blue-700'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="h-8" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={goToToday}
              className="w-full px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            >
              Go to Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
