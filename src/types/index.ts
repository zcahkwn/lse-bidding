export interface Student {
  id: string;
  name: string;
  email: string;
  studentNumber?: string; // Added student number field
  hasUsedToken: boolean;
  isSelected?: boolean;
  hasBid: boolean;
}

export interface Admin {
  username: string;
  password: string;
}

export interface BidOpportunity {
  id: string;
  date: string; // ISO date string
  bidOpenDate?: string; // ISO date string for when bidding opens
  title: string;
  description: string;
  bidders: Student[];
  selectedStudents: Student[];
  isOpen: boolean;
  capacity?: number; // Add capacity field for individual opportunities
}

export interface ClassConfig {
  id: string;
  className: string;
  password: string;
  rewardTitle: string;
  rewardDescription: string;
  capacity: number;
  students: Student[];
  bidders: Student[];
  selectedStudents: Student[];
  bidOpportunities: BidOpportunity[];
}

export interface AuthState {
  isAdmin: boolean;
  isStudent: boolean;
  currentStudent: Student | null;
  currentAdmin: Admin | null;
  currentClass: ClassConfig | null;
}

export interface AppState {
  classes: ClassConfig[];
  currentClass: ClassConfig | null;
  isSelectionInProgress: boolean;
  isSelectionComplete: boolean;
}