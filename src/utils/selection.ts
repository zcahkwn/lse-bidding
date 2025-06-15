
import { Student, ClassConfig } from "@/types";

// Shuffle an array using Fisher-Yates algorithm
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Select students randomly from bidders
export const selectStudents = (
  bidders: Student[],
  capacity: number
): Student[] => {
  if (bidders.length <= capacity) {
    // If bidders are fewer than or equal to capacity, select all
    return bidders;
  }
  
  // Shuffle the bidders and select the required number
  const shuffledBidders = shuffleArray(bidders);
  return shuffledBidders.slice(0, capacity);
};

// Perform the selection with animation steps
export const performSelection = async (
  bidders: Student[],
  capacity: number,
  onStep: (currentStudents: Student[], isComplete: boolean) => void,
  stepDelay: number = 150
): Promise<Student[]> => {
  // If bidders are fewer than capacity, just select them all immediately
  if (bidders.length <= capacity) {
    const selected = bidders.map(student => ({...student, isSelected: true}));
    onStep(selected, true);
    return selected;
  }

  // Start with all bidders, none selected
  const initialStudents = bidders.map(student => ({...student, isSelected: false}));
  onStep(initialStudents, false);
  
  // Wait a moment before starting the selection
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Shuffle the bidders
  const shuffledBidders = shuffleArray([...initialStudents]);
  
  // Animate through the bidders, highlighting each one temporarily
  for (let i = 0; i < shuffledBidders.length; i++) {
    // Highlight current student
    const tempHighlight = [...shuffledBidders];
    tempHighlight[i] = {...tempHighlight[i], isSelected: true};
    onStep(tempHighlight, false);
    
    // Wait for the step delay
    await new Promise(resolve => setTimeout(resolve, stepDelay));
    
    // Remove highlight if not final selection
    if (i >= capacity) {
      tempHighlight[i] = {...tempHighlight[i], isSelected: false};
      onStep(tempHighlight, false);
      await new Promise(resolve => setTimeout(resolve, stepDelay / 2));
    }
  }
  
  // Final selection
  const finalSelection = shuffledBidders.map((student, index) => ({
    ...student,
    isSelected: index < capacity
  }));
  
  onStep(finalSelection, true);
  return finalSelection.filter(student => student.isSelected);
};
