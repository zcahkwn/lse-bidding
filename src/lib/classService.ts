import { supabase } from '@/lib/supabase'
import { ClassConfig, Student, BidOpportunity } from '@/types'

export interface CreateClassData {
  name: string
  password: string
  rewardTitle?: string
  rewardDescription?: string
  capacity?: number
}

export interface SupabaseClass {
  id: string
  name: string
  password_hash: string
  capacity_default: number
  created_at: string
}

export interface SupabaseStudent {
  id: string
  class_id: string
  name: string
  email: string
  student_number: string
  tokens_remaining: number
  created_at: string
}

export interface SupabaseOpportunity {
  id: string
  class_id: string
  description: string
  opens_at: string
  closes_at: string
  event_date: string
  capacity: number
  status: string
  draw_seed: string | null
  created_at: string
}

export interface ClassDeletionResult {
  success: boolean
  classId: string
  className: string
  deletedRecords: {
    students: number
    opportunities: number
    bids: number
    tokenHistory: number
    dinnerTables: number
  }
  auditLogId?: string
  error?: string
  timestamp: string
}

// Create a new class in Supabase
export const createClass = async (classData: CreateClassData): Promise<ClassConfig> => {
  try {
    // Insert class into Supabase
    const { data: classRecord, error: classError } = await supabase
      .from('classes')
      .insert({
        name: classData.name,
        password_hash: classData.password, // In production, this should be hashed
        capacity_default: classData.capacity
      })
      .select()
      .single()

    if (classError) {
      throw new Error(`Failed to create class: ${classError.message}`)
    }

    // Create the dinner table for this class
    const { data: tableResult, error: tableError } = await supabase
      .rpc('create_class_dinner_table', {
        p_class_id: classRecord.id,
        p_class_name: classData.name
      })

    if (tableError) {
      console.warn('Failed to create dinner table:', tableError.message)
      // Don't fail the entire operation if dinner table creation fails
    }

    // Convert Supabase data to ClassConfig format
    const classConfig: ClassConfig = {
      id: classRecord.id,
      className: classRecord.name,
      password: classData.password, // Keep original password for UI
      rewardTitle: classData.rewardTitle || "Dinner with Professor",
      rewardDescription: classData.rewardDescription || "Join the professor for dinner and discussion at a local restaurant.",
      capacity: classRecord.capacity_default,
      students: [],
      bidders: [],
      selectedStudents: [],
      bidOpportunities: [] // Start with empty bidding opportunities
    }

    return classConfig
  } catch (error) {
    console.error('Error creating class:', error)
    throw error
  }
}

// Validate class exists and get basic info before deletion
export const validateClassForDeletion = async (classId: string): Promise<{
  valid: boolean
  className?: string
  recordCounts?: {
    students: number
    opportunities: number
    bids: number
    tokenHistory: number
  }
  error?: string
}> => {
  try {
    // Check if class exists
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return {
        valid: false,
        error: 'Class not found or access denied'
      }
    }

    // Get counts of related records
    const [studentsResult, opportunitiesResult, bidsResult, tokenHistoryResult] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }).eq('class_id', classId),
      supabase.from('opportunities').select('id', { count: 'exact' }).eq('class_id', classId),
      supabase.rpc('count_class_bids', { p_class_id: classId }),
      supabase.rpc('count_class_token_history', { p_class_id: classId })
    ])

    return {
      valid: true,
      className: classData.name,
      recordCounts: {
        students: studentsResult.count || 0,
        opportunities: opportunitiesResult.count || 0,
        bids: bidsResult.data || 0,
        tokenHistory: tokenHistoryResult.data || 0
      }
    }
  } catch (error) {
    console.error('Error validating class for deletion:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

// Atomic class deletion with comprehensive cascading
export const deleteClassAtomic = async (classId: string): Promise<ClassDeletionResult> => {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`Starting atomic deletion for class: ${classId}`)

    // Step 1: Validate class exists and get info
    const validation = await validateClassForDeletion(classId)
    if (!validation.valid) {
      return {
        success: false,
        classId,
        className: 'Unknown',
        deletedRecords: { students: 0, opportunities: 0, bids: 0, tokenHistory: 0, dinnerTables: 0 },
        error: validation.error || 'Class validation failed',
        timestamp
      }
    }

    const className = validation.className!
    console.log(`Validated class: ${className} (${classId})`)

    // Step 2: Execute atomic deletion using RPC function
    const { data: deletionResult, error: deletionError } = await supabase
      .rpc('delete_class_atomic', {
        p_class_id: classId,
        p_class_name: className
      })

    if (deletionError) {
      console.error('Atomic deletion failed:', deletionError)
      throw new Error(`Atomic deletion failed: ${deletionError.message}`)
    }

    if (!deletionResult.success) {
      console.error('Deletion RPC returned failure:', deletionResult.error_message)
      return {
        success: false,
        classId,
        className,
        deletedRecords: { students: 0, opportunities: 0, bids: 0, tokenHistory: 0, dinnerTables: 0 },
        error: deletionResult.error_message || 'Deletion operation failed',
        timestamp
      }
    }

    console.log('Atomic deletion completed successfully:', deletionResult)

    // Step 3: Return success result
    return {
      success: true,
      classId,
      className,
      deletedRecords: {
        students: deletionResult.deleted_counts.students || 0,
        opportunities: deletionResult.deleted_counts.opportunities || 0,
        bids: deletionResult.deleted_counts.bids || 0,
        tokenHistory: deletionResult.deleted_counts.token_history || 0,
        dinnerTables: deletionResult.deleted_counts.dinner_tables || 0
      },
      auditLogId: deletionResult.audit_log_id,
      timestamp
    }

  } catch (error) {
    console.error('Error during class deletion:', error)
    
    // Log the failed deletion attempt
    try {
      await supabase.from('dinner_table_audit').insert({
        table_name: 'classes',
        action: 'DELETE',
        details: {
          class_id: classId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp,
          status: 'FAILED'
        },
        performed_by: null // Will be set by RLS if user is authenticated
      })
    } catch (auditError) {
      console.error('Failed to log deletion error:', auditError)
    }

    return {
      success: false,
      classId,
      className: validation.className || 'Unknown',
      deletedRecords: { students: 0, opportunities: 0, bids: 0, tokenHistory: 0, dinnerTables: 0 },
      error: error instanceof Error ? error.message : 'Unexpected error during deletion',
      timestamp
    }
  }
}

// Legacy delete function - now uses atomic deletion
export const deleteClass = async (classId: string): Promise<void> => {
  const result = await deleteClassAtomic(classId)
  
  if (!result.success) {
    throw new Error(result.error || 'Class deletion failed')
  }
  
  console.log(`Successfully deleted class ${result.className} and ${
    Object.values(result.deletedRecords).reduce((a, b) => a + b, 0)
  } related records`)
}

// Create a new bidding opportunity
export const createBidOpportunity = async (
  classId: string,
  opportunityData: {
    title: string
    description: string
    event_date: string
    opens_at: string
    closes_at: string
    capacity?: number
  }
): Promise<BidOpportunity> => {
  try {
    const { data: opportunityRecord, error } = await supabase
      .from('opportunities')
      .insert({
        class_id: classId,
        description: opportunityData.description,
        opens_at: opportunityData.opens_at,
        closes_at: opportunityData.closes_at,
        event_date: new Date(opportunityData.event_date).toISOString().split('T')[0],
        capacity: opportunityData.capacity
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create opportunity: ${error.message}`)
    }

    // Convert to BidOpportunity format
    const bidOpportunity: BidOpportunity = {
      id: opportunityRecord.id,
      date: opportunityRecord.closes_at,
      bidOpenDate: opportunityRecord.opens_at,
      title: opportunityData.title,
      description: opportunityRecord.description,
      bidders: [],
      selectedStudents: [],
      isOpen: false,
      capacity: opportunityRecord.capacity
    }

    return bidOpportunity
  } catch (error) {
    console.error('Error creating opportunity:', error)
    throw error
  }
}

// Fetch all classes from Supabase
export const fetchClasses = async (): Promise<ClassConfig[]> => {
  try {
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false })

    if (classesError) {
      throw new Error(`Failed to fetch classes: ${classesError.message}`)
    }

    if (!classesData || classesData.length === 0) {
      return []
    }

    // Fetch all related data for each class
    const classConfigs: ClassConfig[] = []

    for (const classRecord of classesData) {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classRecord.id)

      if (studentsError) {
        console.error(`Failed to fetch students for class ${classRecord.id}:`, studentsError.message)
      }

      // Fetch opportunities
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('class_id', classRecord.id)
        .order('event_date', { ascending: true })

      if (opportunitiesError) {
        console.error(`Failed to fetch opportunities for class ${classRecord.id}:`, opportunitiesError.message)
      }

      // Convert to ClassConfig format
      const students: Student[] = (studentsData || []).map(student => ({
        id: student.id,
        name: student.name,
        email: student.email,
        studentNumber: student.student_number || undefined, // Include student number
        hasUsedToken: student.tokens_remaining <= 0,
        hasBid: false // This would need to be calculated from bids table
      }))

      const bidOpportunities: BidOpportunity[] = (opportunitiesData || []).map(opp => ({
        id: opp.id,
        date: opp.closes_at,
        bidOpenDate: opp.opens_at,
        title: `Bidding Opportunity - ${new Date(opp.event_date).toLocaleDateString()}`,
        description: opp.description,
        bidders: [], // This would need to be fetched from bids table
        selectedStudents: [], // This would need to be fetched from selections table
        isOpen: opp.status === 'open',
        capacity: opp.capacity
      }))

      const classConfig: ClassConfig = {
        id: classRecord.id,
        className: classRecord.name,
        password: classRecord.password_hash, // In production, don't expose the hash
        rewardTitle: "Dinner with Professor",
        rewardDescription: "Join the professor for dinner and discussion at a local restaurant.",
        capacity: classRecord.capacity_default,
        students,
        bidders: students.filter(s => s.hasBid),
        selectedStudents: [],
        bidOpportunities
      }

      classConfigs.push(classConfig)
    }

    return classConfigs
  } catch (error) {
    console.error('Error fetching classes:', error)
    throw error
  }
}

// Update class information
export const updateClass = async (classId: string, updates: Partial<CreateClassData>): Promise<void> => {
  try {
    const updateData: any = {}
    
    if (updates.name) updateData.name = updates.name
    if (updates.password) updateData.password_hash = updates.password
    if (updates.capacity !== undefined) updateData.capacity_default = updates.capacity

    const { error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId)

    if (error) {
      throw new Error(`Failed to update class: ${error.message}`)
    }
  } catch (error) {
    console.error('Error updating class:', error)
    throw error
  }
}

// Update bidding opportunity - FIXED VERSION
export const updateBidOpportunity = async (
  opportunityId: string, 
  updates: {
    title?: string
    description?: string
    event_date?: string
    opens_at?: string
    closes_at?: string
    capacity?: number
  }
): Promise<void> => {
  try {
    console.log('Updating opportunity:', opportunityId, 'with data:', updates)
    
    const updateData: any = {}
    
    // REMOVED: title field is not stored in the database, it's a derived field
    // The title is computed from the event_date in the frontend
    if (updates.description) updateData.description = updates.description
    if (updates.event_date) {
      updateData.event_date = new Date(updates.event_date).toISOString().split('T')[0]
      updateData.closes_at = updates.event_date
    }
    if (updates.opens_at) updateData.opens_at = updates.opens_at
    if (updates.capacity !== undefined) updateData.capacity = updates.capacity

    console.log('Sending update data to Supabase:', updateData)

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', opportunityId)
      .select() // Add select to get the updated record back

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error(`Failed to update opportunity: ${error.message}`)
    }

    console.log('Successfully updated opportunity:', data)
  } catch (error) {
    console.error('Error updating opportunity:', error)
    throw error
  }
}

// Delete a bidding opportunity
export const deleteBidOpportunity = async (opportunityId: string): Promise<void> => {
  try {
    console.log('Deleting opportunity:', opportunityId)
    
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', opportunityId)

    if (error) {
      console.error('Supabase delete error:', error)
      throw new Error(`Failed to delete opportunity: ${error.message}`)
    }

    console.log('Successfully deleted opportunity:', opportunityId)
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    throw error
  }
}

// Add students to a class
export const addStudentsToClass = async (classId: string, students: Omit<Student, 'id' | 'hasUsedToken' | 'hasBid'>[]): Promise<Student[]> => {
  try {
    const studentsData = students.map(student => ({
      class_id: classId,
      name: student.name,
      email: student.email,
      student_number: student.studentNumber || null, // Include student number as string
      tokens_remaining: 1
    }))

    const { data: insertedStudents, error } = await supabase
      .from('students')
      .insert(studentsData)
      .select()

    if (error) {
      throw new Error(`Failed to add students: ${error.message}`)
    }

    return (insertedStudents || []).map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      studentNumber: student.student_number || undefined,
      hasUsedToken: student.tokens_remaining <= 0,
      hasBid: false
    }))
  } catch (error) {
    console.error('Error adding students:', error)
    throw error
  }
}