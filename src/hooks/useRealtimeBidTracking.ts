import { useState, useEffect, useCallback } from 'react'
import { 
  getClassBidStatistics, 
  subscribeToClassBidUpdates, 
  ClassBidStatistics 
} from '@/lib/bidTrackingService'

export const useRealtimeBidTracking = (classId: string | null) => {
  const [statistics, setStatistics] = useState<ClassBidStatistics>({
    totalStudents: 0,
    studentsWithTokens: 0,
    studentsWhoBid: 0,
    totalBids: 0,
    opportunities: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial statistics
  const fetchStatistics = useCallback(async () => {
    if (!classId) return

    try {
      setIsLoading(true)
      setError(null)
      const stats = await getClassBidStatistics(classId)
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching bid statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
    } finally {
      setIsLoading(false)
    }
  }, [classId])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!classId) return

    // Fetch initial data
    fetchStatistics()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToClassBidUpdates(classId, (updatedStats) => {
      setStatistics(updatedStats)
    })

    return unsubscribe
  }, [classId, fetchStatistics])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    statistics,
    isLoading,
    error,
    refresh
  }
}