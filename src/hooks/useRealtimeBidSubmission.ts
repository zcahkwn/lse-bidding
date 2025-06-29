import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface BidStatistics {
  totalBids: number
  lastBidTimestamp?: string
  recentBids: any[]
}

export const useRealtimeBidSubmission = () => {
  const [isConnected, setIsConnected] = useState(false)

  // Get class statistics including real-time bid counts
  const getClassStatistics = useCallback(async (classId: string): Promise<BidStatistics> => {
    try {
      // Get all opportunities for this class
      const { data: opportunities, error: oppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('class_id', classId)

      if (oppError) throw oppError

      if (!opportunities || opportunities.length === 0) {
        return {
          totalBids: 0,
          lastBidTimestamp: undefined,
          recentBids: []
        }
      }

      const opportunityIds = opportunities.map(opp => opp.id)

      // Get recent bids with student and opportunity details
      const { data: recentBids, error: bidsError } = await supabase
        .from('bids')
        .select(`
          id,
          bid_amount,
          is_winner,
          created_at,
          student:students(id, name, email),
          opportunity:opportunities(id, description)
        `)
        .in('opportunity_id', opportunityIds)
        .order('created_at', { ascending: false })
        .limit(10)

      if (bidsError) throw bidsError

      // Get total bid count for all opportunities in this class
      const { count: totalBids, error: countError } = await supabase
        .from('bids')
        .select('id', { count: 'exact' })
        .in('opportunity_id', opportunityIds)

      if (countError) throw countError

      // Get last bid timestamp
      const { data: lastBid, error: lastBidError } = await supabase
        .from('bids')
        .select('created_at')
        .in('opportunity_id', opportunityIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastBidError && lastBidError.code !== 'PGRST116') throw lastBidError

      return {
        totalBids: totalBids || 0,
        lastBidTimestamp: lastBid?.created_at,
        recentBids: recentBids || []
      }
    } catch (error) {
      console.error('Error fetching class statistics:', error)
      return {
        totalBids: 0,
        lastBidTimestamp: undefined,
        recentBids: []
      }
    }
  }, [])

  // Get bid counts for specific opportunities
  const getOpportunityBidCounts = useCallback(async (opportunityIds: string[]) => {
    try {
      const bidCounts: Record<string, number> = {}
      
      for (const opportunityId of opportunityIds) {
        const { count, error } = await supabase
          .from('bids')
          .select('id', { count: 'exact' })
          .eq('opportunity_id', opportunityId)

        if (error) {
          console.error(`Error fetching bids for opportunity ${opportunityId}:`, error)
          bidCounts[opportunityId] = 0
        } else {
          bidCounts[opportunityId] = count || 0
        }
      }

      return bidCounts
    } catch (error) {
      console.error('Error fetching opportunity bid counts:', error)
      return {}
    }
  }, [])

  // Subscribe to real-time bid updates for a class
  const subscribeToClassBids = useCallback((classId: string, onUpdate: (stats: BidStatistics) => void) => {
    const channel = supabase
      .channel(`class-bids-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
        },
        async (payload) => {
          console.log('Real-time bid update received:', payload)
          
          // Refresh statistics when any bid changes
          const updatedStats = await getClassStatistics(classId)
          onUpdate(updatedStats)
        }
      )
      .subscribe((status) => {
        console.log('Bid subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [getClassStatistics])

  return {
    isConnected,
    getClassStatistics,
    getOpportunityBidCounts,
    subscribeToClassBids
  }
}