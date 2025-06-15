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

// Student authentication using both email AND student number
export const authenticateStudentWithBoth = (
  email: string,
  studentNumber: string,
  password: string,
  classes: ClassConfig[]
): AuthState => {
  // Find the class with the matching password
  const foundClass = classes.find(c => c.password === password);
  
  if (!foundClass) return initialAuthState;
  
  // Find the student in the class by BOTH email AND student number
  const student = foundClass.students.find(s => 
    s.email.toLowerCase() === email.toLowerCase() &&
    s.studentNumber && 
    s.studentNumber.toLowerCase() === studentNumber.toLowerCase()
  );
  
  if (!student) return initialAuthState;
  
  return {
    ...initialAuthState,
    isStudent: true,
    currentStudent: student,
    currentClass: foundClass
  };
};

// Legacy functions for backward compatibility (if needed elsewhere)
export const authenticateStudent = (
  email: string, 
  password: string,
  classes: ClassConfig[]
): AuthState => {
  const foundClass = classes.find(c => c.password === password);
  if (!foundClass) return initialAuthState;
  
  const student = foundClass.students.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (!student) return initialAuthState;
  
  return {
    ...initialAuthState,
    isStudent: true,
    currentStudent: student,
    currentClass: foundClass
  };
};

export const authenticateStudentByNumber = (
  studentNumber: string, 
  password: string,
  classes: ClassConfig[]
): AuthState => {
  const foundClass = classes.find(c => c.password === password);
  if (!foundClass) return initialAuthState;
  
  const student = foundClass.students.find(s => 
    s.studentNumber && s.studentNumber.toLowerCase() === studentNumber.toLowerCase()
  );
  if (!student) return initialAuthState;
  
  return {
    ...initialAuthState,
    isStudent: true,
    currentStudent: student,
    currentClass: foundClass
  };
};

// Log out function
export const logout = (): AuthState => {
  return initialAuthState;
};