import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'

import type { Meeting } from '../types'

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return format(date, 'EEEE')
  if (isThisMonth(date)) return format(date, 'MMM d')
  return format(date, 'MMM d, yyyy')
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getMeetingTypeConfig(type: string) {
  const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    product: { label: 'Product', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: 'Package' },
    engineering: { label: 'Engineering', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: 'Code' },
    sales: { label: 'Sales', color: 'text-green-400', bg: 'bg-green-400/10', icon: 'TrendingUp' },
    interview: { label: 'Interview', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: 'User' },
    hiring: { label: 'Hiring', color: 'text-pink-400', bg: 'bg-pink-400/10', icon: 'Users' },
    strategy: { label: 'Strategy', color: 'text-teal-400', bg: 'bg-teal-400/10', icon: 'Target' },
    customer: { label: 'Customer', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: 'Heart' },
    design: { label: 'Design', color: 'text-violet-400', bg: 'bg-violet-400/10', icon: 'Palette' },
    team: { label: 'Team', color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: 'Users' },
    '1:1': { label: '1:1', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: 'User' },
  }
  return configs[type] || configs['team']
}

export function getSentimentConfig(sentiment: string) {
  const configs: Record<string, { label: string; color: string; bg: string; bar: string }> = {
    positive: { label: 'Positive', color: 'text-fathom-success', bg: 'bg-fathom-success/10', bar: 'bg-fathom-success' },
    neutral: { label: 'Neutral', color: 'text-fathom-warning', bg: 'bg-fathom-warning/10', bar: 'bg-fathom-warning' },
    mixed: { label: 'Mixed', color: 'text-fathom-purple', bg: 'bg-fathom-purple/10', bar: 'bg-fathom-purple' },
  }
  return configs[sentiment] || configs['neutral']
}

export function groupMeetingsByDate(meetings: Meeting[]): Record<string, Meeting[]> {
  const groups: Record<string, Meeting[]> = {}
  meetings.forEach(m => {
    const dateKey = formatDate(m.date)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(m)
  })
  return groups
}
