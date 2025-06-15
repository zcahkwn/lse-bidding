import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { performSelection } from "@/utils/selection";
import { Student, ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/dates";
import { Trophy, Users } from "lucide-react";

interface SelectionProcessProps {
  currentClass: ClassConfig;
  onSelectionComplete: (selectedStudents: Student[], opportunityId?: string) => void;
}

const SelectionProcess = ({ currentClass, onSelectionComplete }: SelectionProcessProps) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentBidders, setCurrentBidders] = useState<Student[]>([]);
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  
  const { toast } = useToast();
  
  // Sound effects
  const [tickSound] = useState(() => new Audio("/selection-tick.mp3"));
  const [successSound] = useState(() => new Audio("/selection-complete.mp3"));

  // Get the currently selected opportunity
  const selectedOpportunity = currentClass.bidOpportunities?.find(
    opp => opp.id === selectedOpportunityId
  );
  
  // When component mounts or currentClass changes, set default opportunity
  useEffect(() => {
    if (currentClass.bidOpportunities && currentClass.bidOpportunities.length > 0) {
      setSelectedOpportunityId(currentClass.bidOpportunities[0].id);
      setCurrentBidders(currentClass.bidOpportunities[0].bidders);
      
      // Check if there are already selected students for this opportunity
      if (currentClass.bidOpportunities[0].selectedStudents && 
          currentClass.bidOpportunities[0].selectedStudents.length > 0) {
        setSelectedStudents(currentClass.bidOpportunities[0].selectedStudents);
        setSelectionComplete(true);
      } else {
        setSelectedStudents([]);
        setSelectionComplete(false);
      }
    } else {
      setCurrentBidders(currentClass.bidders);
      
      // Check if there are already selected students at the class level
      if (currentClass.selectedStudents && currentClass.selectedStudents.length > 0) {
        setSelectedStudents(currentClass.selectedStudents);
        setSelectionComplete(true);
      } else {
        setSelectedStudents([]);
        setSelectionComplete(false);
      }
    }
  }, [currentClass]);
  
  // When opportunity changes, update bidders and selected students
  useEffect(() => {
    if (selectedOpportunityId && currentClass.bidOpportunities) {
      const opportunity = currentClass.bidOpportunities.find(
        opp => opp.id === selectedOpportunityId
      );
      if (opportunity) {
        setCurrentBidders(opportunity.bidders);
        
        // Check if there are already selected students for this opportunity
        if (opportunity.selectedStudents && opportunity.selectedStudents.length > 0) {
          setSelectedStudents(opportunity.selectedStudents);
          setSelectionComplete(true);
        } else {
          setSelectedStudents([]);
          setSelectionComplete(false);
        }
      }
    }
  }, [selectedOpportunityId, currentClass]);
  
  // Handle updates during selection process
  const handleSelectionStep = useCallback((students: Student[], isComplete: boolean) => {
    setCurrentBidders(students);
    
    if (!isComplete) {
      tickSound.currentTime = 0;
      tickSound.play().catch(error => console.log("Error playing sound:", error));
    } else {
      successSound.currentTime = 0;
      successSound.play().catch(error => console.log("Error playing sound:", error));
    }
  }, [tickSound, successSound]);
  
  // Start the selection process
  const startSelection = async () => {
    let biddersToSelect: Student[];
    
    if (selectedOpportunityId && currentClass.bidOpportunities) {
      const opportunity = currentClass.bidOpportunities.find(
        opp => opp.id === selectedOpportunityId
      );
      if (!opportunity || opportunity.bidders.length === 0) {
        toast({
          title: "No bidders",
          description: "There are no students who have placed a bid for this opportunity.",
          variant: "destructive",
        });
        return;
      }
      biddersToSelect = opportunity.bidders;
    } else {
      if (currentClass.bidders.length === 0) {
        toast({
          title: "No bidders",
          description: "There are no students who have placed a bid yet.",
          variant: "destructive",
        });
        return;
      }
      biddersToSelect = currentClass.bidders;
    }
    
    setIsSelecting(true);
    
    try {
      // Perform the selection animation
      const selected = await performSelection(
        biddersToSelect,
        currentClass.capacity,
        handleSelectionStep,
        200
      );
      
      // Store the selected students
      setSelectedStudents(selected);
      setSelectionComplete(true);
      
      // When selection is complete, update the parent component
      onSelectionComplete(selected, selectedOpportunityId || undefined);
      
      toast({
        title: "Selection complete",
        description: `${selected.length} students have been selected.`,
      });
    } catch (error) {
      console.error("Selection error:", error);
      toast({
        title: "Selection failed",
        description: "An error occurred during the selection process.",
        variant: "destructive",
      });
    } finally {
      setIsSelecting(false);
    }
  };

  const resetSelection = () => {
    setSelectionComplete(false);
    setSelectedStudents([]);
    
    // Reset the opportunity's selected students
    if (selectedOpportunityId) {
      onSelectionComplete([], selectedOpportunityId);
    } else {
      onSelectionComplete([]);
    }
  };

  const hasOpportunities = currentClass.bidOpportunities && currentClass.bidOpportunities.length > 0;
  
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8">
      {/* Opportunity Selection (if multiple opportunities exist) */}
      {hasOpportunities && currentClass.bidOpportunities.length > 1 && (
        <div className="w-full max-w-md">
          <Select 
            value={selectedOpportunityId || ''} 
            onValueChange={setSelectedOpportunityId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a dinner opportunity" />
            </SelectTrigger>
            <SelectContent>
              {currentClass.bidOpportunities.map((opp) => (
                <SelectItem key={opp.id} value={opp.id}>
                  {opp.title} - {formatDate(opp.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prominent Start Random Selection Button */}
      <div className="text-center">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Random Selection Process
          </h2>
          <p className="text-lg text-gray-600">
            {currentBidders.length} students have placed bids • Capacity: {currentClass.capacity}
          </p>
        </div>
        
        {!selectionComplete ? (
          <Button 
            onClick={startSelection} 
            disabled={isSelecting || currentBidders.length === 0}
            size="lg"
            className="px-12 py-6 text-xl font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            {isSelecting ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Selecting...
              </>
            ) : (
              <>
                <Trophy className="w-6 h-6 mr-3" />
                Start Random Selection
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={resetSelection}
            variant="outline"
            size="lg"
            className="px-12 py-6 text-xl font-semibold"
          >
            Reset Selection
          </Button>
        )}
      </div>

      {/* Selected Student Display Area */}
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Users className="w-6 h-6" />
            Selected Student{selectedStudents.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedStudents.length > 0 ? (
            <div className="space-y-4">
              {selectedStudents.map((student, index) => (
                <div 
                  key={student.id} 
                  className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center"
                >
                  <div className="text-2xl font-bold text-green-800 mb-2">
                    🎉 {student.name}
                  </div>
                  <div className="text-lg text-green-600 mb-1">
                    {student.email}
                  </div>
                  <div className="text-sm text-green-500">
                    Selected for {hasOpportunities && selectedOpportunity ? selectedOpportunity.title : currentClass.rewardTitle}
                  </div>
                </div>
              ))}
              
              <div className="text-center pt-4">
                <p className="text-lg font-medium text-gray-700">
                  🎊 Congratulations! {selectedStudents.length} student{selectedStudents.length !== 1 ? 's have' : ' has'} been selected!
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-xl text-gray-500 mb-2">
                No students selected yet
              </p>
              <p className="text-gray-400">
                Click "Start Random Selection" to begin the process
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectionProcess;