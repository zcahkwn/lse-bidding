import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EnhancedBidCard from "@/components/student/EnhancedBidCard";
import { Student, ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Users, Coins, ChevronRight, LogOut, Menu, X } from "lucide-react";

const StudentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get student and class data from location state
  const initialStudent = location.state?.student || null;
  const initialClassConfig = location.state?.classConfig || null;
  const enrolledClasses = location.state?.enrolledClasses || [initialClassConfig].filter(Boolean);
  
  // Use local state to track current class and student
  const [student, setStudent] = useState<Student | null>(initialStudent);
  const [currentClass, setCurrentClass] = useState<ClassConfig | null>(initialClassConfig);
  const [availableClasses, setAvailableClasses] = useState<ClassConfig[]>(enrolledClasses);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Load the latest class configuration from localStorage on component mount
  useEffect(() => {
    if (student && currentClass) {
      const storedClassesStr = localStorage.getItem("classData");
      if (storedClassesStr) {
        try {
          const storedClasses = JSON.parse(storedClassesStr);
          
          // Update available classes with latest data
          const updatedAvailableClasses = availableClasses.map(enrolledClass => {
            const updatedClass = storedClasses.find((c: ClassConfig) => c.id === enrolledClass.id);
            return updatedClass || enrolledClass;
          });
          setAvailableClasses(updatedAvailableClasses);
          
          // Update current class
          const updatedCurrentClass = storedClasses.find((c: ClassConfig) => c.id === currentClass.id);
          if (updatedCurrentClass) {
            setCurrentClass(updatedCurrentClass);
            
            // Update student data from the current class
            const updatedStudent = updatedCurrentClass.students.find((s: Student) => s.id === student.id);
            if (updatedStudent) {
              setStudent(updatedStudent);
            }
          }
        } catch (error) {
          console.error("Error parsing stored class data:", error);
        }
      }
    }
  }, []);
  
  const handleClassSwitch = (classId: string) => {
    const selectedClass = availableClasses.find(c => c.id === classId);
    if (selectedClass && student) {
      // Find the student record in the selected class
      const studentInClass = selectedClass.students.find(s => s.email === student.email && s.studentNumber === student.studentNumber);
      
      if (studentInClass) {
        setCurrentClass(selectedClass);
        setStudent(studentInClass);
        
        // Close sidebar on mobile after selection
        if (isMobile) {
          setSidebarOpen(false);
        }
        
        toast({
          title: "Switched class",
          description: `Now viewing ${selectedClass.className}`,
        });
      } else {
        toast({
          title: "Error switching class",
          description: "Could not find your record in the selected class",
          variant: "destructive",
        });
      }
    }
  };
  
  if (!student || !currentClass) {
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
  const bidOpportunities = currentClass.bidOpportunities || [];
  
  // Find first open opportunity (if any)
  const nextOpenOpportunity = bidOpportunities.find(
    opportunity => getBidOpportunityStatus(opportunity) === "Open for Bidding"
  );
  
  // Find opportunity the student has bid on (if any)
  const studentBidOpportunity = bidOpportunities.find(
    opportunity => opportunity.bidders && opportunity.bidders.some(bidder => bidder.id === student.id)
  );

  // Find the opportunity where the student used their token (for students who used token but may not have bid)
  const tokenUsedOpportunity = studentBidOpportunity || (student.hasUsedToken ? bidOpportunities[0] : null);
  
  const handleBidSubmitted = (bidId: string, updatedStudent: Student, opportunityId: string) => {
    // Get current classes from localStorage
    const storedClassesStr = localStorage.getItem("classData");
    if (storedClassesStr) {
      try {
        const storedClasses = JSON.parse(storedClassesStr);
        
        // Find and update the current class
        const updatedClasses = storedClasses.map((c: ClassConfig) => {
          if (c.id === currentClass.id) {
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
        const updatedClassConfig = updatedClasses.find((c: ClassConfig) => c.id === currentClass.id);
        
        // Update UI state
        setStudent(updatedStudent);
        setCurrentClass(updatedClassConfig);
        
        // Update available classes as well
        const updatedAvailableClasses = availableClasses.map(availableClass => {
          const updated = updatedClasses.find((c: ClassConfig) => c.id === availableClass.id);
          return updated || availableClass;
        });
        setAvailableClasses(updatedAvailableClasses);
        
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
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full shadow-md"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative z-40 h-full bg-white border-r transition-all duration-300 overflow-y-auto
        ${sidebarOpen ? 'w-64 left-0' : 'w-0 -left-64 md:w-20 md:left-0'}
      `}>
        <div className="p-4 border-b">
          <h2 className={`font-bold text-lg ${!sidebarOpen && 'md:hidden'}`}>My Classes</h2>
          {!sidebarOpen && <BookOpen className="hidden md:block mx-auto h-6 w-6 text-gray-500" />}
        </div>
        
        <div className="p-2">
          {availableClasses.map((classConfig) => {
            const studentInClass = classConfig.students.find(s => s.email === student.email);
            const hasUsedToken = studentInClass?.hasUsedToken || false;
            const isCurrentClass = classConfig.id === currentClass.id;
            const activeBidOpportunities = classConfig.bidOpportunities?.filter(opp => 
              getBidOpportunityStatus(opp) === "Open for Bidding"
            ).length || 0;

            return (
              <div 
                key={classConfig.id} 
                className={`
                  cursor-pointer rounded-md p-3 mb-2 transition-all
                  ${isCurrentClass 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : 'hover:bg-gray-100 border-l-4 border-transparent'}
                `}
                onClick={() => handleClassSwitch(classConfig.id)}
              >
                {sidebarOpen ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{classConfig.className}</h3>
                      {isCurrentClass && <ChevronRight className="h-4 w-4 text-blue-500" />}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {classConfig.students.length}
                      </span>
                      <Badge variant={hasUsedToken ? "secondary" : "default"} className="text-xs">
                        {hasUsedToken ? "Used" : "Available"}
                      </Badge>
                    </div>
                    
                    {activeBidOpportunities > 0 && (
                      <div className="mt-1 text-xs text-blue-600 font-medium">
                        {activeBidOpportunities} active bid{activeBidOpportunities > 1 ? 's' : ''}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="hidden md:flex flex-col items-center justify-center py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      isCurrentClass ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {classConfig.className.charAt(0).toUpperCase()}
                    </div>
                    {hasUsedToken ? (
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className={`${sidebarOpen ? 'w-full' : 'md:w-auto md:mx-auto md:p-2'}`}
          >
            {sidebarOpen ? (
              "Logout"
            ) : (
              <LogOut className="hidden md:block h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${
        sidebarOpen ? 'md:ml-64' : 'md:ml-20'
      }`}>
        <header className="bg-white border-b p-4 sticky top-0 z-30">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-heading font-bold">{currentClass.className}</h1>
              <p className="text-muted-foreground">Welcome, {student.name}</p>
            </div>
            <div className="hidden md:block">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
        
        <main className="p-4 max-w-4xl mx-auto">
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

                  {/* Enhanced bid status section */}
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
                    ) : student.hasUsedToken && tokenUsedOpportunity ? (
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="text-sm">{tokenUsedOpportunity.title}</div>
                        <div className="text-sm">
                          <Badge variant="secondary" className="text-xs">Token Used</Badge>
                        </div>
                        <div className="text-sm">
                          <Badge variant="outline" className="text-xs">No Bid</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2 text-center">
                        {student.hasUsedToken ? "Token used, but no specific opportunity found" : "No bid placed yet"}
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
                    {bidOpportunities.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No bidding opportunities available yet
                      </div>
                    ) : (
                      bidOpportunities.map((opportunity) => (
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
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <EnhancedBidCard 
                student={student}
                classConfig={currentClass}
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
                      <div className="text-sm text-muted-foreground">Student Number:</div>
                      <div className="col-span-2">{student.studentNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="text-sm text-muted-foreground">Current Class:</div>
                      <div className="col-span-2">{currentClass.className}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="text-sm text-muted-foreground">Current Reward:</div>
                      <div className="col-span-2">{currentClass.rewardTitle}</div>
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
                    {/* Show which opportunity the token was used for */}
                    {student.hasUsedToken && tokenUsedOpportunity && (
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Token Used For:</div>
                        <div className="col-span-2 text-sm">
                          {tokenUsedOpportunity.title}
                        </div>
                      </div>
                    )}
                    {availableClasses.length > 1 && (
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Enrolled Classes:</div>
                        <div className="col-span-2 text-sm">
                          {availableClasses.length} classes
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;