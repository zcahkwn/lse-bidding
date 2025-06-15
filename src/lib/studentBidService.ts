import { supabase } from '@/lib/supabase'
import { Student } from '@/types'

export interface StudentBidRequest {
  studentId: string
  opportunityId: string
  classPassword: string
}

export interface StudentBidResponse {
  success: boolean
  bidId?: string
  updatedStudent?: Student
  errorMessage?: string
  timestamp?: string
}

// Submit a bid and update student token status
export async function submitStudentBid(request: StudentBidRequest): Promise<StudentBidResponse> {
  const { studentId, opportunityId, classPassword } = request
  
  try {
    console.log('Starting bid submission for student:', studentId)

    // Call the secure bid submission RPC function
    const { data: result, error } = await supabase.rpc('submit_student_bid_secure', {
      p_student_id: studentId,
      p_opportunity_id: opportunityId,
      p_class_password: classPassword
    })

    if (error) {
      console.error('Bid submission error:', error)
      return {
        success: false,
        errorMessage: error.message || 'Failed to submit bid'
      }
    }

    if (!result.success) {
      return {
        success: false,
        errorMessage: result.error_message || 'Bid submission failed'
      }
    }

    // Fetch updated student data
    const { data: updatedStudent, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (studentError) {
      console.error('Error fetching updated student:', studentError)
    }

    return {
      success: true,
      bidId: result.bid_id,
      updatedStudent: updatedStudent ? {
        id: updatedStudent.id,
        name: updatedStudent.name,
        email: updatedStudent.email,
        studentNumber: updatedStudent.student_number,
        hasUsedToken: updatedStudent.tokens_remaining <= 0,
        hasBid: true
      } : undefined,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Unexpected error during bid submission:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unexpected error occurred'
    }
  }
}

// Get real-time student status
export async function getStudentStatus(studentId: string): Promise<Student | null> {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (error || !student) {
      console.error('Error fetching student status:', error)
      return null
    }

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      studentNumber: student.student_number,
      hasUsedToken: student.tokens_remaining <= 0,
      hasBid: student.token_status === 'used'
    }
  } catch (error) {
    console.error('Error getting student status:', error)
    return null
  }
}

// Subscribe to real-time student updates
export function subscribeToStudentUpdates(
  studentId: string,
  onUpdate: (student: Student) => void
) {
  const channel = supabase
    .channel(`student-${studentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'students',
        filter: `id=eq.${studentId}`,
      },
      (payload) => {
        console.log('Student update received:', payload)
        const updatedData = payload.new
        
        const student: Student = {
          id: updatedData.id,
          name: updatedData.name,
          email: updatedData.email,
          studentNumber: updatedData.student_number,
          hasUsedToken: updatedData.tokens_remaining <= 0,
          hasBid: updatedData.token_status === 'used'
        }
        
        onUpdate(student)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}