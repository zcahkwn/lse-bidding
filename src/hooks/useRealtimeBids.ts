import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface RealtimeBid {
  id: string
  student_id: string
  opportunity_id: string
  bid_amount: number
  created_at: string
  student?: {
    name: string
    email: string
  }
}

export interface RealtimeSelection {
  id: string
  opportunity_id: string
  student_id: string
  selected_at: string
  student?: {
    name: string
    email: string
  }
}

export const useRealtimeBids = (opportunityId: string | null) => {
  const [bids, setBids] = useState<RealtimeBid[]>([])
  const [selections, setSelections] = useState<RealtimeSelection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!opportunityId) {
      setIsLoading(false)
      return
    }

    // Fetch initial bids
    const fetchBids = async () => {
      try {
        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select(`
            *,
            student:students(name, email)
          `)
          .eq('opportunity_id', opportunityId)

        if (bidsError) throw bidsError

        const { data: selectionsData, error: selectionsError } = await supabase
          .from('selections')
          .select(`
            *,
            student:students(name, email)
          `)
          .eq('opportunity_id', opportunityId)

        if (selectionsError) throw selectionsError

        setBids(bidsData || [])
        setSelections(selectionsData || [])
      } catch (error) {
        console.error('Error fetching bids:', error)
        toast({
          title: "Error",
          description: "Failed to load bidding data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBids()

    // Subscribe to real-time changes for bids
    const bidsChannel = supabase
      .channel(`bids-${opportunityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        async (payload) => {
          console.log('Bid change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            // Fetch the student data for the new bid
            const { data: studentData } = await supabase
              .from('students')
              .select('name, email')
              .eq('id', payload.new.student_id)
              .single()

            const newBid = {
              ...payload.new,
              student: studentData
            } as RealtimeBid

            setBids(prev => [...prev, newBid])
            
            toast({
              title: "New Bid Placed",
              description: `${studentData?.name || 'A student'} has placed a bid!`,
            })
          } else if (payload.eventType === 'DELETE') {
            setBids(prev => prev.filter(bid => bid.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to real-time changes for selections
    const selectionsChannel = supabase
      .channel(`selections-${opportunityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'selections',
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        async (payload) => {
          console.log('Selection change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            // Fetch the student data for the new selection
            const { data: studentData } = await supabase
              .from('students')
              .select('name, email')
              .eq('id', payload.new.student_id)
              .single()

            const newSelection = {
              ...payload.new,
              student: studentData
            } as RealtimeSelection

            setSelections(prev => [...prev, newSelection])
            
            toast({
              title: "Student Selected",
              description: `${studentData?.name || 'A student'} has been selected!`,
            })
          } else if (payload.eventType === 'DELETE') {
            setSelections(prev => prev.filter(selection => selection.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(bidsChannel)
      supabase.removeChannel(selectionsChannel)
    }
  }, [opportunityId, toast])

  const placeBid = async (studentId: string) => {
    if (!opportunityId) return false

    try {
      const { error } = await supabase
        .from('bids')
        .insert({
          student_id: studentId,
          opportunity_id: opportunityId,
          bid_amount: 1
        })

      if (error) throw error

      // Update student's token status
      await supabase
        .from('students')
        .update({ has_used_token: true })
        .eq('id', studentId)

      return true
    } catch (error) {
      console.error('Error placing bid:', error)
      toast({
        title: "Error",
        description: "Failed to place bid",
        variant: "destructive",
      })
      return false
    }
  }

  const selectStudents = async (studentIds: string[]) => {
    if (!opportunityId) return false

    try {
      // First, clear existing selections
      await supabase
        .from('selections')
        .delete()
        .eq('opportunity_id', opportunityId)

      // Insert new selections
      const selections = studentIds.map(studentId => ({
        opportunity_id: opportunityId,
        student_id: studentId
      }))

      const { error } = await supabase
        .from('selections')
        .insert(selections)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error selecting students:', error)
      toast({
        title: "Error",
        description: "Failed to select students",
        variant: "destructive",
      })
      return false
    }
  }

  return {
    bids,
    selections,
    isLoading,
    placeBid,
    selectStudents
  }
}