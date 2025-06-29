import { Student, Admin, ClassConfig, AuthState } from "@/types";

// Mock admin data - in a real app, this would be stored securely
const adminUser: Admin = {
  username: "admin",
  password: "admin123"
};

// Initial auth state
export const initialAuthState: AuthState = {
  isAdmin: false,
  isStudent: false,
  currentStudent: null,
  currentAdmin: null,
  currentClass: null
};

// Admin authentication
export const authenticateAdmin = (username: string, password: string): AuthState => {
  if (username === adminUser.username && password === adminUser.password) {
    return {
      ...initialAuthState,
      isAdmin: true,
      currentAdmin: adminUser
    };
  }
  return initialAuthState;
};

// Student authentication using email and student number across all classes
export const authenticateStudent = (
  email: string,
  studentNumber: string,
  classes: ClassConfig[]
): { 
  success: boolean; 
  student?: Student; 
  enrolledClasses: ClassConfig[];
  errorMessage?: string;
} => {
  const enrolledClasses: ClassConfig[] = [];
  let foundStudent: Student | undefined;

  // Search through all classes to find the student
  for (const classConfig of classes) {
    const student = classConfig.students.find(s => 
      s.email.toLowerCase() === email.toLowerCase() &&
      s.studentNumber && 
      s.studentNumber.toLowerCase() === studentNumber.toLowerCase()
    );
    
    if (student) {
      enrolledClasses.push(classConfig);
      if (!foundStudent) {
        foundStudent = student; // Use the first found student record
      }
    }
  }

  if (!foundStudent || enrolledClasses.length === 0) {
    return {
      success: false,
      enrolledClasses: [],
      errorMessage: "No student found with these credentials across any class"
    };
  }

  return {
    success: true,
    student: foundStudent,
    enrolledClasses
  };
};

// Create auth state for student with specific class
export const createStudentAuthState = (
  student: Student,
  selectedClass: ClassConfig
): AuthState => {
  return {
    ...initialAuthState,
    isStudent: true,
    currentStudent: student,
    currentClass: selectedClass
  };
};

// Legacy functions for backward compatibility (deprecated)
export const authenticateStudentWithBoth = (
  email: string,
  studentNumber: string,
  password: string,
  classes: ClassConfig[]
): AuthState => {
  // This function is now deprecated but kept for compatibility
  // It will use the new authentication method and ignore the password
  const result = authenticateStudent(email, studentNumber, classes);
  
  if (result.success && result.student && result.enrolledClasses.length > 0) {
    // Return auth state with the first enrolled class
    return createStudentAuthState(result.student, result.enrolledClasses[0]);
  }
  
  return initialAuthState;
};

export const authenticateStudentByNumber = (
  studentNumber: string, 
  password: string,
  classes: ClassConfig[]
): AuthState => {
  // Deprecated - kept for compatibility
  return initialAuthState;
};

// Log out function
export const logout = (): AuthState => {
  return initialAuthState;
};