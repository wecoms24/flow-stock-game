import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface RankChangeNotificationProps {
  oldRank: number
  newRank: number
}

export function RankChangeNotification({ oldRank, newRank }: RankChangeNotificationProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3000) // Show for 3 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  const isRankUp = newRank < oldRank
  const isChampion = newRank === 1 && oldRank !== 1

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-bounce-in">
      <div className="rank-notification">
        {isChampion ? (
          <div className="champion-notification text-center p-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-2xl border-4 border-yellow-600">
            <h1 className="text-6xl font-bold text-white arcade-text mb-4 animate-pulse drop-shadow-lg">
              🏆 CHAMPION 🏆
            </h1>
            <p className="text-2xl text-white font-bold drop-shadow">
              You've overtaken all rivals!
            </p>
          </div>
        ) : isRankUp ? (
          <div className="rank-up-notification text-center p-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg shadow-2xl border-4 border-green-600">
            <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">RANK UP!</h2>
            <p className="text-4xl text-white font-bold glow drop-shadow">
              #{oldRank} → #{newRank}
            </p>
          </div>
        ) : (
          <div className="rank-down-notification text-center p-8 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg shadow-2xl border-4 border-red-600">
            <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">RANK DOWN</h2>
            <p className="text-4xl text-white font-bold drop-shadow">
              #{oldRank} → #{newRank}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
