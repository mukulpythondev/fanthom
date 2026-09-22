import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

interface MeetingPlayerProps {
  duration: number
  onTimeUpdate?: (time: number) => void
  className?: string
}

export function MeetingPlayer({ duration, onTimeUpdate, className = '' }: MeetingPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 1
          if (next >= duration) {
            stopPlayback()
            return duration
          }
          onTimeUpdate?.(next)
          return next
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, duration, onTimeUpdate, stopPlayback])

  const togglePlay = () => {
    if (currentTime >= duration) {
      setCurrentTime(0)
      onTimeUpdate?.(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(prev => !prev)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10)
    setCurrentTime(time)
    onTimeUpdate?.(time)
    if (isPlaying) {
      stopPlayback()
      setIsPlaying(true)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`bg-fathom-surface border border-fathom-border-subtle rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-fathom-accent hover:bg-fathom-accent-hover text-white flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-fathom-text-primary font-mono">{formatTime(currentTime)}</span>
            <span className="text-xs text-fathom-text-tertiary font-mono">{formatTime(duration)}</span>
          </div>

          <div className="relative h-1.5 bg-fathom-bg rounded-full cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full bg-fathom-accent rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
