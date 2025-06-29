import { supabase } from '@/lib/supabase'
import { Student, BidOpportunity } from '@/types'

export interface BidStatus {
  opportunityId: string
  opportunityDescription: string
  hasBid: boolean
  bidAmount: number
  isWinner: boolean
  bidCreatedAt?: string
}

export interface ClassBidStatistics {
  totalStudents: number
  studentsWithTokens: number
  studentsWhoBid: number
  totalBids: number
  opportunities: Array<{
    opportunityId: string
    description: string
    eventDate: string
    capacity: number
    bidCount: number
  }>
}

// Get bid count for a specific opportunity
export async function getOpportunityBidCount(opportunityId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_opportunity_bid_count', { opportunity_uuid: opportunityId })

    if (error) throw error
    return data || 0
  } catch (error) {
    console.error('Error getting opportunity bid count:', error)
    return 0
  }
}

// Check if a student has bid on a specific opportunity
export async function studentHasBid(studentId: string, opportunityId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('student_has_bid', { 
        student_uuid: studentId, 
        opportunity_uuid: opportunityId 
      })

    if (error) throw error
    return data || false
  } catch (error) {
    console.error('Error checking if student has bid:', error)
    return false
  }
}

// Get student's bid status across all opportunities in a class
export async function getStudentBidStatus(studentId: string, classId: string): Promise<BidStatus[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_student_bid_status', { 
        student_uuid: studentId, 
        class_uuid: classId 
      })

    if (error) throw error
    
    return (data || []).map((row: any) => ({
      opportunityId: row.opportunity_id,
      opportunityDescription: row.opportunity_description,
      hasBid: row.has_bid,
      bidAmount: row.bid_amount,
      isWinner: row.is_winner,
      bidCreatedAt: row.bid_created_at
    }))
  } catch (error) {
    console.error('Error getting student bid status:', error)
    return []
  }
}

// Get bid counts for all opportunities in a class
export async function getClassOpportunityBidCounts(classId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .rpc('get_class_opportunity_bid_counts', { class_uuid: classId })

    if (error) throw error
    
    const bidCounts: Record<string, number> = {}
    ;(data || []).forEach((row: any) => {
      bidCounts[row.opportunity_id] = row.bid_count
    })
    
    return bidCounts
  } catch (error) {
    console.error('Error getting class opportunity bid counts:', error)
    return {}
  }
}

// Get comprehensive class bid statistics for admin dashboard
export async function getClassBidStatistics(classId: string): Promise<ClassBidStatistics> {
  try {
    const { data, error } = await supabase
      .rpc('get_class_bid_statistics', { class_uuid: classId })

    if (error) throw error
    
    return data || {
      totalStudents: 0,
      studentsWithTokens: 0,
      studentsWhoBid: 0,
      totalBids: 0,
      opportunities: []
    }
  } catch (error) {
    console.error('Error getting class bid statistics:', error)
    return {
      totalStudents: 0,
      studentsWithTokens: 0,
      studentsWhoBid: 0,
      totalBids: 0,
      opportunities: []
    }
  }
}

// Subscribe to real-time bid updates for a class
export function subscribeToClassBidUpdates(
  classId: string,
  onUpdate: (statistics: ClassBidStatistics) => void
) {
  const channel = supabase
    .channel(`class-bids-${classId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bids',
      },
      async () => {
        // Refresh statistics when any bid changes
        const updatedStats = await getClassBidStatistics(classId)
        onUpdate(updatedStats)
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
      },
      async () => {
        // Refresh when student token status changes
        const updatedStats = await getClassBidStatistics(classId)
        onUpdate(updatedStats)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Update bid opportunities with real-time bid counts
export async function updateBidOpportunitiesWithCounts(
  opportunities: BidOpportunity[],
  classId: string
): Promise<BidOpportunity[]> {
  try {
    const bidCounts = await getClassOpportunityBidCounts(classId)
    
    return opportunities.map(opportunity => {
      const bidCount = bidCounts[opportunity.id] || 0
      
      // Create mock bidders array based on bid count
      // In a real implementation, you'd fetch actual bidder details
      const mockBidders: Student[] = Array.from({ length: bidCount }, (_, index) => ({
        id: `bidder-${opportunity.id}-${index}`,
        name: `Bidder ${index + 1}`,
        email: `bidder${index + 1}@example.com`,
        hasUsedToken: true,
        hasBid: true
      }))
      
      return {
        ...opportunity,
        bidders: mockBidders
      }
    })
  } catch (error) {
    console.error('Error updating opportunities with bid counts:', error)
    return opportunities
  }
}