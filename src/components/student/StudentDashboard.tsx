import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedBidCard from "@/components/student/EnhancedBidCard";
import StudentSidebar from "@/components/student/StudentSidebar";
import { Student, ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Users, Calendar, Trophy, Clock, Coins } from "lucide-react";

const StudentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get student and classes data from location state
  const initialStudent = location.state?.student || null;
  const allClasses = location.state?.classes || [];
  
  // Use local state to track current student and selected class
  const [student, setStudent] = useState<Student | null>(initialStudent);
  const [classes, setClasses] = useState<ClassConfig[]>(allClasses);
  const [currentClass, setCurrentClass] = useState<ClassConfig | null>(
    allClasses.length > 0 ? allClasses[0] : null
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Load the latest class configuration from localStorage on component mount
  useEffect(() => {
    if (student && classes.length > 0) {
      const storedClassesStr = localStorage.getItem("classData");
      if (storedClassesStr) {
        try {
          const storedClasses = JSON.parse(storedClassesStr);
          // Update classes with stored data
          const updatedClasses = classes.map(classConfig => {
            const storedClass = storedClasses.find((c: ClassConfig) => c.id === classConfig.id);
            return storedClass || classConfig;
          });
          setClasses(updatedClasses);
          
          // Update current class if it exists in stored data
          if (currentClass) {
            const updatedCurrentClass = updatedClasses.find(c => c.id === currentClass.id);
            if (updatedCurrentClass) {
              setCurrentClass(updatedCurrentClass);
            }
          }
          
          // Update student data from the stored data
          if (currentClass) {
            const updatedStudent = updatedClasses
              .find(c => c.id === currentClass.id)?.students
              .find((s: Student) => s.id === student.id);
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
  
  if (!student || classes.length === 0) {
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
  
  const handleSelectClass = (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      setCurrentClass(selectedClass);
      
      // Update student data for the selected class
      const studentInClass = selectedClass.students.find(s => s.id === student.id);
      if (studentInClass) {
        setStudent(studentInClass);
      }
    }
  };
  
  const handleBidSubmitted = (bidId: string, updatedStudent: Student, opportunityId: string) => {
    if (!currentClass) return;
    
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
        const updatedAllClasses = classes.map(c => {
          const updated = updatedClasses.find((uc: ClassConfig) => uc.id === c.id);
          return updated || c;
        });
        
        // Update UI state
        setStudent(updatedStudent);
        setClasses(updatedAllClasses);
        setCurrentClass(updatedClassConfig);
        
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
  
  // Ensure bidOpportunities exists, default to empty array if not
  const bidOpportunities = currentClass?.bidOpportunities || [];
  
  // Find first open opportunity (if any)
  const nextOpenOpportunity = bidOpportunities.find(
    opportunity => getBidOpportunityStatus(opportunity) === "Open for Bidding"
  );
  
  // Find opportunity the student has bid on (if any)
  const studentBidOpportunity = bidOpportunities.find(
    opportunity => opportunity.bidders && opportunity.bidders.some(bidder => bidder.id === student.id)
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b relative z-50">
        <div className="container mx-auto p-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </Button>
            <h1 className="text-2xl font-heading font-bold text-academy-blue mb-4 md:mb-0">
              Student Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {student.name}</span>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>
      
      {/* Sidebar */}
      <StudentSidebar
        classes={classes}
        currentClass={currentClass}
        onSelectClass={handleSelectClass}
        isCollapsed={sidebarCollapsed}
      />
      
      <main className={`min-h-[calc(100vh-64px)] transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-80'
      }`}>
        <div className="container mx-auto p-4 max-w-6xl">
          {currentClass ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Class Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-heading flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {currentClass.className}
                    </CardTitle>
                    <CardDescription>{currentClass.rewardDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Coins className="w-6 h-6 mx-auto mb-2 text-academy-blue" />
                        <div className="text-lg font-semibold">
                          {student.hasUsedToken ? "Used" : "Available"}
                        </div>
                        <div className="text-sm text-gray-600">Token Status</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-academy-blue" />
                        <div className="text-lg font-semibold">{bidOpportunities.length}</div>
                        <div className="text-sm text-gray-600">Total Opportunities</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Trophy className="w-6 h-6 mx-auto mb-2 text-academy-blue" />
                        <div className="text-lg font-semibold">
                          {studentBidOpportunity ? "Yes" : "No"}
                        </div>
                        <div className="text-sm text-gray-600">Bid Placed</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Users className="w-6 h-6 mx-auto mb-2 text-academy-blue" />
                        <div className="text-lg font-semibold">{currentClass.students.length}</div>
                        <div className="text-sm text-gray-600">Total Students</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">Token Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <span>Your bidding token:</span>
                        {student.hasUsedToken ? (
                          <Badge variant="secondary">Used</Badge>
                        ) : (
                          <Badge className="bg-academy-blue">Available</Badge>
                        )}
                      </div>
                      
                      {nextOpenOpportunity && !student.hasUsedToken && (
                        <div className="p-3 bg-gray-50 rounded-md">
                          <p className="text-sm">
                            <span className="font-medium">
                              {nextOpenOpportunity.bidders?.length || 0}
                            </span> student(s) have already placed bids for the next open opportunity
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">Bid Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {studentBidOpportunity ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Event:</span>
                            <span className="text-sm font-medium">{studentBidOpportunity.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Status:</span>
                            <Badge variant="outline" className="text-xs">Bid Placed</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Result:</span>
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
                        <div className="text-sm text-muted-foreground text-center py-4">
                          {student.hasUsedToken ? "Token used, no bid placed yet" : "No bid placed yet"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="opportunities" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EnhancedBidCard 
                    student={student}
                    classConfig={currentClass}
                    onBidSubmitted={handleBidSubmitted}
                  />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">Upcoming Opportunities</CardTitle>
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
              </TabsContent>
              
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-heading">Your Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Name:</div>
                        <div className="col-span-2 font-medium">{student.name}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Email:</div>
                        <div className="col-span-2">{student.email}</div>
                      </div>
                      {student.studentNumber && (
                        <div className="grid grid-cols-3 gap-1">
                          <div className="text-sm text-muted-foreground">Student Number:</div>
                          <div className="col-span-2">{student.studentNumber}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Classes Enrolled:</div>
                        <div className="col-span-2">{classes.length}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-sm text-muted-foreground">Current Class:</div>
                        <div className="col-span-2">{currentClass.className}</div>
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
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-xl mb-4">No Class Selected</h2>
                <p className="text-muted-foreground">
                  Please select a class from the sidebar to view its details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;