// Hook to listen for rank changes
// Separated from RankChangeNotification.tsx for React Fast Refresh compatibility

import { useState, useEffect } from 'react'

export interface RankChangeData {
  oldRank: number
  newRank: number
}

export function useRankChangeNotification() {
  const [notification, setNotification] = useState<RankChangeData | null>(null)

  useEffect(() => {
    const handleRankChange = (e: Event) => {
      const customEvent = e as CustomEvent<RankChangeData>
      setNotification(customEvent.detail)

      // Clear after animation
      setTimeout(() => {
        setNotification(null)
      }, 3500)
    }

    window.addEventListener('rankChange', handleRankChange)

    return () => {
      window.removeEventListener('rankChange', handleRankChange)
    }
  }, [])

  return notification
}
