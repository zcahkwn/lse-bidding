import { useState, useEffect, useCallback } from 'react'
import { submitStudentBid, getStudentStatus, subscribeToStudentUpdates, StudentBidRequest, StudentBidResponse } from '@/lib/studentBidService'
import { Student } from '@/types'
import { useToast } from '@/hooks/use-toast'

export interface StudentBiddingState {
  isSubmitting: boolean
  student: Student | null
  lastBidResponse: StudentBidResponse | null
  error: string | null
}

export const useStudentBidding = (initialStudent: Student) => {
  const [state, setState] = useState<StudentBiddingState>({
    isSubmitting: false,
    student: initialStudent,
    lastBidResponse: null,
    error: null
  })
  
  const { toast } = useToast()

  // Subscribe to real-time student updates
  useEffect(() => {
    const unsubscribe = subscribeToStudentUpdates(
      initialStudent.id,
      (updatedStudent) => {
        console.log('Received student update:', updatedStudent)
        setState(prev => ({
          ...prev,
          student: updatedStudent
        }))
        
        // Show toast notification for token status change
        if (updatedStudent.hasUsedToken && !prev.student?.hasUsedToken) {
          toast({
            title: "Token Status Updated",
            description: "Your token has been used for bidding",
          })
        }
      }
    )

    return unsubscribe
  }, [initialStudent.id, toast])

  // Refresh student status from database
  const refreshStudentStatus = useCallback(async () => {
    try {
      const updatedStudent = await getStudentStatus(initialStudent.id)
      if (updatedStudent) {
        setState(prev => ({
          ...prev,
          student: updatedStudent
        }))
      }
    } catch (error) {
      console.error('Error refreshing student status:', error)
    }
  }, [initialStudent.id])

  // Submit a bid
  const submitBid = useCallback(async (request: StudentBidRequest): Promise<StudentBidResponse> => {
    setState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null
    }))

    try {
      const response = await submitStudentBid(request)
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        lastBidResponse: response,
        error: response.success ? null : response.errorMessage || 'Bid submission failed',
        student: response.updatedStudent || prev.student
      }))

      if (response.success) {
        toast({
          title: "Bid Submitted Successfully",
          description: "Your token has been used and your bid is recorded",
        })
        
        // Refresh student status to ensure we have the latest data
        await refreshStudentStatus()
      } else {
        toast({
          title: "Bid Submission Failed",
          description: response.errorMessage || 'An error occurred while submitting your bid',
          variant: "destructive",
        })
      }

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error'
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage
      }))

      toast({
        title: "Bid Submission Error",
        description: errorMessage,
        variant: "destructive",
      })

      return {
        success: false,
        errorMessage
      }
    }
  }, [toast, refreshStudentStatus])

  return {
    ...state,
    submitBid,
    refreshStudentStatus
  }
}