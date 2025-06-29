import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedBidCard from "@/components/student/EnhancedBidCard";
import { Student, ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import { useNavigate, useLocation } from "react-router-dom";

const StudentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get student and class data from location state
  const initialStudent = location.state?.student || null;
  const classConfig = location.state?.classConfig || null;
  
  // Use local state to track and update student's token status
  const [student, setStudent] = useState<Student | null>(initialStudent);
  
  // Load the latest class configuration from localStorage on component mount
  useEffect(() => {
    if (student && classConfig) {
      const storedClassesStr = localStorage.getItem("classData");
      if (storedClassesStr) {
        try {
          const storedClasses = JSON.parse(storedClassesStr);
          // Find the current class in the stored data
          const updatedClass = storedClasses.find((c: ClassConfig) => c.id === classConfig.id);
          if (updatedClass) {
            // Update student data from the stored data
            const updatedStudent = updatedClass.students.find((s: Student) => s.id === student.id);
            if (updatedStudent) {
              setStudent(updatedStudent);
            }
            
            // Update location state to include the latest class config
            navigate(location.pathname, {
              replace: true,
              state: {
                student: updatedStudent || student,
                classConfig: updatedClass
              }
            });
          }
        } catch (error) {
          console.error("Error parsing stored class data:", error);
        }
      }
    }
  }, []);
  
  if (!student || !classConfig) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-heading font-bold mb-6">Student Dashboard</h1>
        <p className="text-center text-muted-foreground py-8">
          Please log in to view your dashboard
        </p>
        <div className="flex justify-center">
          <Button onClick={() => navigate("/")}>Back to Login</Button>
        </div>
      </div>
    );
  }
  
  // Ensure bidOpportunities exists, default to empty array if not
  const bidOpportunities = classConfig.bidOpportunities || [];
  
  // Find first open opportunity (if any)
  const nextOpenOpportunity = bidOpportunities.find(
    opportunity => getBidOpportunityStatus(opportunity) === "Open for Bidding"
  );
  
  // Find opportunity the student has bid on (if any)
  const studentBidOpportunity = bidOpportunities.find(
    opportunity => opportunity.bidders && opportunity.bidders.some(bidder => bidder.id === student.id)
  );
  
  const handleBidSubmitted = (bidId: string, updatedStudent: Student, opportunityId: string) => {
    // Get current classes from localStorage
    const storedClassesStr = localStorage.getItem("classData");
    if (storedClassesStr) {
      try {
        const storedClasses = JSON.parse(storedClassesStr);
        
        // Find and update the current class
        const updatedClasses = storedClasses.map((c: ClassConfig) => {
          if (c.id === classConfig.id) {
            // Update the student in the students array
            const updatedStudents = c.students.map((s: Student) => 
              s.id === updatedStudent.id ? updatedStudent : s
            );
            
            // Update the opportunity with the new bidder
            const updatedOpportunities = c.bidOpportunities.map((opp: BidOpportunity) => {
              if (opp.id === opportunityId) {
                // Make sure we're not adding duplicate bidders
                if (!opp.bidders.some(b => b.id === updatedStudent.id)) {
                  return {
                    ...opp,
                    bidders: [...opp.bidders, updatedStudent]
                  };
                }
              }
              return opp;
            });
            
            // Also update class-level bidders list for backward compatibility
            const updatedBidders = c.bidders && Array.isArray(c.bidders) ? 
              [...c.bidders] : [];
            
            if (!updatedBidders.some(b => b.id === updatedStudent.id)) {
              updatedBidders.push(updatedStudent);
            }
            
            // Return updated class
            return {
              ...c,
              students: updatedStudents,
              bidders: updatedBidders,
              bidOpportunities: updatedOpportunities
            };
          }
          return c;
        });
        
        // Save updated classes back to localStorage
        localStorage.setItem("classData", JSON.stringify(updatedClasses));
        
        // Find the updated class config to use for state updates
        const updatedClassConfig = updatedClasses.find((c: ClassConfig) => c.id === classConfig.id);
        
        // Update UI state
        setStudent(updatedStudent);
        
        // Update location state to reflect the changes for page refreshes
        navigate(location.pathname, {
          replace: true,
          state: {
            student: updatedStudent,
            classConfig: updatedClassConfig
          }
        });
      } catch (error) {
        console.error("Error updating class data:", error);
      }
    }
    
    toast({
      title: "Bid placed successfully",
      description: `You have placed a bid for the opportunity.`,
    });
  };
  
  const handleLogout = () => {
    navigate("/");
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {student.name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="mt-4 md:mt-0">
          Logout
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Token Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Your bidding token:</span>
                {student.hasUsedToken ? (
                  <Badge variant="secondary">Used</Badge>
                ) : (
                  <Badge className="bg-academy-blue">Available</Badge>
                )}
              </div>
              
              {nextOpenOpportunity && !student.hasUsedToken && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">
                      {nextOpenOpportunity.bidders?.length || 0}
                    </span> student(s) have already placed bids for the next open opportunity
                  </p>
                </div>
              )}

              {/* Add new section for bid status */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-2">Your Bid Status</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-medium text-sm">Event</div>
                  <div className="font-medium text-sm">Status</div>
                  <div className="font-medium text-sm">Result</div>
                </div>
                
                {studentBidOpportunity ? (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="text-sm">{studentBidOpportunity.title}</div>
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">Bid Placed</Badge>
                    </div>
                    <div className="text-sm">
                      {studentBidOpportunity.selectedStudents && 
                       studentBidOpportunity.selectedStudents.some(s => s.id === student.id) ? (
                        <Badge variant="default" className="bg-green-500 text-xs">Selected</Badge>
                      ) : getBidOpportunityStatus(studentBidOpportunity) === "Selection Complete" ? (
                        <Badge variant="secondary" className="text-xs">Not Selected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2 text-center">
                    {student.hasUsedToken ? "Token used, no bid placed yet" : "No bid placed yet"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Upcoming Bidding Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {bidOpportunities.map((opportunity) => (
                  <div 
                    key={opportunity.id}
                    className="p-3 border rounded-md flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{opportunity.title}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(opportunity.date)}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant={getBidOpportunityStatus(opportunity) === "Open for Bidding" ? "default" : "secondary"} className="mb-1">
                        {getBidOpportunityStatus(opportunity)}
                      </Badge>
                      {opportunity.bidders && opportunity.bidders.some(bidder => bidder.id === student.id) && (
                        <span className="text-xs text-academy-blue">You've placed a bid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <EnhancedBidCard 
            student={student}
            classConfig={classConfig}
            onBidSubmitted={handleBidSubmitted}
          />
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm text-muted-foreground">Name:</div>
                  <div className="col-span-2 font-medium">{student.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm text-muted-foreground">Email:</div>
                  <div className="col-span-2">{student.email}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm text-muted-foreground">Class:</div>
                  <div className="col-span-2">{classConfig.className}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm text-muted-foreground">Current Reward:</div>
                  <div className="col-span-2">{classConfig.rewardTitle}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm text-muted-foreground">Token Status:</div>
                  <div className="col-span-2">
                    {student.hasUsedToken ? (
                      <Badge variant="secondary">Used</Badge>
                    ) : (
                      <Badge className="bg-academy-blue">Available</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;