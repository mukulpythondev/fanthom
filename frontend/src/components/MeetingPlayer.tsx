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

  // Generate waveform bars
  const barCount = 60
  const bars = Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.3)
  const activeIndex = Math.floor((currentTime / duration) * barCount)

  return (
    <div className={`bg-steno-surface border border-steno-border-subtle rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-5">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-steno-accent hover:bg-steno-accent-hover text-steno-bg flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-steno-text-primary font-mono">{formatTime(currentTime)}</span>
            <span className="text-xs text-steno-text-tertiary font-mono">{formatTime(duration)}</span>
          </div>

          {/* Waveform visualization */}
          <div className="flex items-end gap-[2px] h-10 mb-2">
            {bars.map((h, i) => {
              const isPlayed = i < activeIndex
              const isCurrent = i === activeIndex
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isCurrent ? 'bg-steno-accent' : isPlayed ? 'bg-steno-accent/40' : 'bg-steno-border'
                  }`}
                  style={{ height: `${h * 100}%`, minHeight: '3px' }}
                />
              )
            })}
          </div>

          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-steno-border rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-steno-accent"
          />
        </div>
      </div>
    </div>
  )
}
