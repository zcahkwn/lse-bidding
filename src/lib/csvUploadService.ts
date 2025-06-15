import { supabase } from '@/lib/supabase'

export interface CSVUploadResult {
  success: boolean
  recordsProcessed: number
  errors: string[]
  duplicatesSkipped: number
  message: string
  replacedCount?: number // New field to track replaced students
}

export interface StudentCSVData {
  name: string
  email: string
  student_number: string // Required field
  class_id: string
}

// Validate CSV file format
const validateCSVFile = (file: File): string | null => {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'File must be a CSV file (.csv extension)'
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be less than 5MB'
  }
  
  return null
}

// Parse CSV content and validate structure
const parseCSVContent = (csvText: string): { data: any[], errors: string[] } => {
  const errors: string[] = []
  const lines = csvText.trim().split('\n')
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row')
    return { data: [], errors }
  }
  
  // Parse header row
  const headerRow = lines[0].split(',').map(col => col.trim().toLowerCase())
  
  // Check for required columns - now both email AND student number are required
  const requiredColumns = ['name', 'email', 'student number']
  const nameIndex = headerRow.findIndex(col => 
    col === 'name' || col === 'student name'
  )
  const emailIndex = headerRow.findIndex(col => 
    col === 'email' || col === 'email address'
  )
  const studentNumberIndex = headerRow.findIndex(col => 
    col === 'student number' || col === 'student_number' || col === 'id' || col === 'student id'
  )
  
  const missingColumns = []
  if (nameIndex === -1) missingColumns.push('Name')
  if (emailIndex === -1) missingColumns.push('Email')
  if (studentNumberIndex === -1) missingColumns.push('Student Number')
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}. All three fields (Name, Email, Student Number) are required for login.`)
    return { data: [], errors }
  }
  
  // Parse data rows
  const data: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines
    
    const columns = line.split(',').map(col => col.trim())
    
    if (columns.length <= Math.max(nameIndex, emailIndex, studentNumberIndex)) {
      errors.push(`Row ${i + 1}: Insufficient columns`)
      continue
    }
    
    const name = columns[nameIndex]?.trim()
    const email = columns[emailIndex]?.trim()
    const studentNumber = columns[studentNumberIndex]?.trim()
    
    // Validate required fields - all three are now required
    if (!name) {
      errors.push(`Row ${i + 1}: Name is required`)
      continue
    }
    
    if (!email) {
      errors.push(`Row ${i + 1}: Email is required`)
      continue
    }
    
    if (!studentNumber) {
      errors.push(`Row ${i + 1}: Student Number is required for login`)
      continue
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push(`Row ${i + 1}: Invalid email format: ${email}`)
      continue
    }
    
    data.push({
      name,
      email: email.toLowerCase(),
      student_number: studentNumber, // Store as string
      row: i + 1
    })
  }
  
  return { data, errors }
}

// Remove all existing students from the specific class ONLY
const removeExistingStudents = async (classId: string): Promise<{ removedCount: number, errors: string[] }> => {
  try {
    console.log(`Removing existing students for class ID: ${classId}`)
    
    // First, get count of existing students for this specific class
    const { data: existingStudents, error: countError } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId)
    
    if (countError) {
      throw new Error(`Failed to count existing students: ${countError.message}`)
    }
    
    const existingCount = existingStudents?.length || 0
    console.log(`Found ${existingCount} existing students in class ${classId}`)
    
    // Delete all existing students for this specific class only
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('class_id', classId)
    
    if (deleteError) {
      throw new Error(`Failed to remove existing students: ${deleteError.message}`)
    }
    
    console.log(`Successfully removed ${existingCount} students from class ${classId}`)
    return { removedCount: existingCount, errors: [] }
  } catch (error) {
    console.error('Error removing existing students:', error)
    return { 
      removedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error removing existing students'] 
    }
  }
}

// Check for duplicates within the new CSV data (within the same class)
const checkForInternalDuplicates = (students: any[]): { cleanStudents: any[], duplicates: string[] } => {
  const seenEmails = new Set<string>()
  const seenStudentNumbers = new Set<string>()
  const cleanStudents: any[] = []
  const duplicates: string[] = []
  
  students.forEach(student => {
    const emailLower = student.email.toLowerCase()
    const studentNumberLower = student.student_number.toLowerCase()
    
    const isDuplicateEmail = seenEmails.has(emailLower)
    const isDuplicateStudentNumber = seenStudentNumbers.has(studentNumberLower)
    
    if (isDuplicateEmail || isDuplicateStudentNumber) {
      duplicates.push(`Row ${student.row}: ${student.name} (Email: ${student.email}, Student #: ${student.student_number})`)
    } else {
      seenEmails.add(emailLower)
      seenStudentNumbers.add(studentNumberLower)
      cleanStudents.push(student)
    }
  })
  
  return { cleanStudents, duplicates }
}

// Upload students to Supabase with proper error handling using upsert
const uploadStudentsToSupabase = async (
  students: any[], 
  classId: string
): Promise<{ success: number, errors: string[] }> => {
  const errors: string[] = []
  let successCount = 0
  
  console.log(`Uploading ${students.length} students to class ${classId}`)
  
  // Prepare data for insertion
  const studentsData = students.map(student => ({
    class_id: classId,
    name: student.name,
    email: student.email,
    student_number: student.student_number, // Required field
    tokens_remaining: 1,
    token_status: 'unused',
    bidding_result: 'pending'
  }))
  
  try {
    // Use upsert instead of insert to handle existing emails
    // This will update existing students or insert new ones
    const { data, error } = await supabase
      .from('students')
      .upsert(studentsData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.error('Database upsert error:', error)
      errors.push(`Database error: ${error.message}`)
    } else {
      successCount = data?.length || 0
      console.log(`Successfully upserted ${successCount} students`)
    }
  } catch (error) {
    console.error('Unexpected error during upload:', error)
    errors.push(`Unexpected error during upload: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return { success: successCount, errors }
}

// Main CSV upload function - replaces existing students for the specific class only
export const uploadCSVToSupabase = async (
  file: File, 
  classId: string
): Promise<CSVUploadResult> => {
  const result: CSVUploadResult = {
    success: false,
    recordsProcessed: 0,
    errors: [],
    duplicatesSkipped: 0,
    message: '',
    replacedCount: 0
  }
  
  try {
    console.log(`Starting CSV upload for class: ${classId}`)
    
    // Step 1: Validate file
    const fileValidationError = validateCSVFile(file)
    if (fileValidationError) {
      result.errors.push(fileValidationError)
      result.message = 'File validation failed'
      return result
    }
    
    // Step 2: Read and parse CSV content
    const csvText = await file.text()
    const { data: parsedData, errors: parseErrors } = parseCSVContent(csvText)
    
    if (parseErrors.length > 0) {
      result.errors.push(...parseErrors)
    }
    
    if (parsedData.length === 0) {
      result.message = 'No valid student data found in CSV file. Remember: Name, Email, and Student Number are all required.'
      return result
    }
    
    console.log(`Parsed ${parsedData.length} students from CSV`)
    
    // Step 3: Check for duplicates within the CSV itself
    const { cleanStudents, duplicates } = checkForInternalDuplicates(parsedData)
    result.duplicatesSkipped = duplicates.length
    
    if (duplicates.length > 0) {
      result.errors.push(`Found ${duplicates.length} duplicate entries within the CSV file:`)
      result.errors.push(...duplicates)
    }
    
    if (cleanStudents.length === 0) {
      result.message = 'No valid unique students found in the CSV file after removing duplicates'
      return result
    }
    
    console.log(`${cleanStudents.length} unique students after duplicate removal`)
    
    // Step 4: Remove existing students from this specific class ONLY
    console.log(`Removing existing students from class: ${classId}`)
    const { removedCount, errors: removeErrors } = await removeExistingStudents(classId)
    result.replacedCount = removedCount
    
    if (removeErrors.length > 0) {
      result.errors.push(...removeErrors)
      result.message = 'Failed to remove existing students'
      return result
    }
    
    console.log(`Removed ${removedCount} existing students from class ${classId}`)
    
    // Step 5: Upload new students to Supabase using upsert
    console.log(`Uploading ${cleanStudents.length} new students to class ${classId}`)
    const { success: uploadedCount, errors: uploadErrors } = await uploadStudentsToSupabase(cleanStudents, classId)
    
    if (uploadErrors.length > 0) {
      result.errors.push(...uploadErrors)
    }
    
    // Step 6: Prepare final result
    result.recordsProcessed = uploadedCount
    result.success = uploadedCount > 0
    
    if (result.success) {
      if (result.replacedCount > 0) {
        result.message = `Successfully uploaded ${uploadedCount} students for this class`
      } else {
        result.message = `Successfully uploaded ${uploadedCount} students to this class`
      }
      
      if (result.duplicatesSkipped > 0) {
        result.message += ` (${result.duplicatesSkipped} duplicates within CSV were skipped)`
      }
    } else {
      result.message = 'Failed to upload any students'
    }
    
    console.log(`Upload completed for class ${classId}. Success: ${result.success}, Records: ${result.recordsProcessed}`)
    
  } catch (error) {
    console.error('CSV upload error:', error)
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    result.message = 'CSV upload failed due to unexpected error'
  }
  
  return result
}

// Function to update student token status
export const updateStudentTokenStatus = async (
  studentId: string, 
  hasUsedToken: boolean
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({ 
        tokens_remaining: hasUsedToken ? 0 : 1,
        token_status: hasUsedToken ? 'used' : 'unused'
      })
      .eq('id', studentId)
    
    if (error) {
      throw new Error(`Failed to update token status: ${error.message}`)
    }
  } catch (error) {
    console.error('Error updating token status:', error)
    throw error
  }
}

// Function to update student bidding result
export const updateStudentBiddingResult = async (
  studentId: string, 
  result: 'won' | 'lost' | 'pending'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({ bidding_result: result })
      .eq('id', studentId)
    
    if (error) {
      throw new Error(`Failed to update bidding result: ${error.message}`)
    }
  } catch (error) {
    console.error('Error updating bidding result:', error)
    throw error
  }
}

// Function to batch update bidding results
export const batchUpdateBiddingResults = async (
  winners: string[], 
  losers: string[]
): Promise<void> => {
  try {
    // Update winners
    if (winners.length > 0) {
      const { error: winnersError } = await supabase
        .from('students')
        .update({ bidding_result: 'won' })
        .in('id', winners)
      
      if (winnersError) {
        throw new Error(`Failed to update winners: ${winnersError.message}`)
      }
    }
    
    // Update losers
    if (losers.length > 0) {
      const { error: losersError } = await supabase
        .from('students')
        .update({ bidding_result: 'lost' })
        .in('id', losers)
      
      if (losersError) {
        throw new Error(`Failed to update losers: ${losersError.message}`)
      }
    }
  } catch (error) {
    console.error('Error batch updating bidding results:', error)
    throw error
  }
}