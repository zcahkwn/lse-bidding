import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AdminLoginForm from "@/components/admin/LoginForm";
import StudentLogin from "@/components/student/StudentLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import Dashboard from "@/pages/admin/Dashboard";
import Students from "@/pages/admin/Students";
import Rewards from "@/pages/admin/Rewards";
import Selection from "@/pages/admin/Selection";
import StudentDashboard from "@/components/student/StudentDashboard";
import { Student, ClassConfig, AuthState, BidOpportunity } from "@/types";
import { initialAuthState, logout } from "@/utils/auth";
import { createClass, fetchClasses, updateClass, deleteClassAtomic, updateBidOpportunity, ClassDeletionResult } from "@/lib/classService";
import { Loader2, AlertTriangle, CheckCircle, Trash2, Menu, X } from "lucide-react";

const Index = () => {
  // Auth state
  const [auth, setAuth] = useState<AuthState>(initialAuthState);
  
  // App state
  const [classes, setClasses] = useState<ClassConfig[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassConfig | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // New class dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassPassword, setNewClassPassword] = useState("");
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  
  // Class deletion state
  const [deletionInProgress, setDeletionInProgress] = useState<string | null>(null);
  const [deletionResult, setDeletionResult] = useState<ClassDeletionResult | null>(null);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  
  const { toast } = useToast();
  
  // Load classes from Supabase on first render
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoading(true);
        const fetchedClasses = await fetchClasses();
        setClasses(fetchedClasses);
        
        // If there's a current class in localStorage, try to find it in the fetched data
        const storedCurrentClassId = localStorage.getItem("currentClassId");
        if (storedCurrentClassId) {
          const foundClass = fetchedClasses.find(c => c.id === storedCurrentClassId);
          if (foundClass) {
            setCurrentClass(foundClass);
          } else {
            // Clear invalid stored class ID
            localStorage.removeItem("currentClassId");
          }
        } else if (fetchedClasses.length > 0) {
          // Auto-select first class if none is selected
          setCurrentClass(fetchedClasses[0]);
        }
      } catch (error) {
        console.error("Error loading classes:", error);
        toast({
          title: "Error loading data",
          description: "Failed to load classes from database. Please try again.",
          variant: "destructive",
        });
        
        // Fallback to localStorage if Supabase fails
        try {
          const storedClasses = localStorage.getItem("classData");
          if (storedClasses) {
            const parsedClasses = JSON.parse(storedClasses) as ClassConfig[];
            setClasses(parsedClasses);
          }
        } catch (localError) {
          console.error("Error loading from localStorage:", localError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClasses();
  }, [toast]);
  
  // Save current class ID to localStorage when it changes
  useEffect(() => {
    if (currentClass) {
      localStorage.setItem("currentClassId", currentClass.id);
    } else {
      localStorage.removeItem("currentClassId");
    }
  }, [currentClass]);
  
  const handleAdminLogin = (isSuccess: boolean) => {
    if (isSuccess) {
      setAuth({
        ...initialAuthState,
        isAdmin: true,
        currentAdmin: { username: "admin", password: "admin123" }
      });
    }
  };
  
  const handleStudentLogin = (isSuccess: boolean) => {
    if (isSuccess) {
      // Auth state is set within the StudentLogin component
      // This is just a callback for the UI flow
    }
  };
  
  const handleLogout = () => {
    setAuth(logout());
  };
  
  const handleSelectClass = (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      setCurrentClass(selectedClass);
    }
  };
  
  const handleCreateClass = () => {
    setIsDialogOpen(true);
  };
  
  const handleSaveNewClass = async () => {
    if (!newClassName || !newClassPassword) {
      toast({
        title: "Missing information",
        description: "Please provide both a class name and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingClass(true);
    
    try {
      const newClass = await createClass({
        name: newClassName,
        password: newClassPassword,
        rewardTitle: "Dinner with Professor",
        rewardDescription: "Join the professor for dinner and discussion at a local restaurant.",
        capacity: 7
      });
      
      const updatedClasses = [...classes, newClass];
      setClasses(updatedClasses);
      setCurrentClass(newClass);
      setIsDialogOpen(false);
      setNewClassName("");
      setNewClassPassword("");
      
      toast({
        title: "Class created successfully",
        description: `Class "${newClassName}" has been created and saved to the database`,
      });
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Failed to create class",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingClass(false);
    }
  };
  
  const handleUpdateStudents = (updatedStudents: Student[]) => {
    if (!currentClass) return;
    
    const updatedClass: ClassConfig = {
      ...currentClass,
      students: updatedStudents
    };
    
    const updatedClasses = classes.map(c => 
      c.id === currentClass.id ? updatedClass : c
    );
    
    setClasses(updatedClasses);
    setCurrentClass(updatedClass);
    
    // Also update localStorage for backward compatibility
    localStorage.setItem("classData", JSON.stringify(updatedClasses));
  };
  
  const handleUpdateReward = (config: Partial<ClassConfig>) => {
    if (!currentClass) return;
    
    const updatedClass: ClassConfig = {
      ...currentClass,
      ...config
    };
    
    const updatedClasses = classes.map(c => 
      c.id === currentClass.id ? updatedClass : c
    );
    
    setClasses(updatedClasses);
    setCurrentClass(updatedClass);
    
    // Also update localStorage for backward compatibility
    localStorage.setItem("classData", JSON.stringify(updatedClasses));
  };
  
  const handleSelectionComplete = (selectedStudents: Student[]) => {
    if (!currentClass) return;
    
    const updatedClass: ClassConfig = {
      ...currentClass,
      selectedStudents: selectedStudents
    };
    
    const updatedClasses = classes.map(c => 
      c.id === currentClass.id ? updatedClass : c
    );
    
    setClasses(updatedClasses);
    setCurrentClass(updatedClass);
    
    // Also update localStorage for backward compatibility
    localStorage.setItem("classData", JSON.stringify(updatedClasses));
  };
  
  const handleUpdateBidOpportunity = async (opportunityId: string, updatedOpportunity: BidOpportunity) => {
    if (!currentClass) return;
    
    try {
      // Update the opportunity in the database
      await updateBidOpportunity(opportunityId, {
        title: updatedOpportunity.title,
        description: updatedOpportunity.description,
        event_date: updatedOpportunity.date,
        opens_at: updatedOpportunity.bidOpenDate,
        closes_at: updatedOpportunity.date,
        capacity: updatedOpportunity.capacity
      });

      // Update local state
      const updatedOpportunities = currentClass.bidOpportunities.map(opp => 
        opp.id === opportunityId ? updatedOpportunity : opp
      );
      
      const updatedClass: ClassConfig = {
        ...currentClass,
        bidOpportunities: updatedOpportunities
      };
      
      const updatedClasses = classes.map(c => 
        c.id === currentClass.id ? updatedClass : c
      );
      
      setClasses(updatedClasses);
      setCurrentClass(updatedClass);
      
      // Also update localStorage for backward compatibility
      localStorage.setItem("classData", JSON.stringify(updatedClasses));

      toast({
        title: "Opportunity updated successfully",
        description: "The bidding opportunity has been saved to the database.",
      });
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast({
        title: "Failed to update opportunity",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleOpportunityCreated = (opportunity: BidOpportunity) => {
    if (!currentClass) return;
    
    const updatedClass: ClassConfig = {
      ...currentClass,
      bidOpportunities: [...currentClass.bidOpportunities, opportunity]
    };
    
    const updatedClasses = classes.map(c => 
      c.id === currentClass.id ? updatedClass : c
    );
    
    setClasses(updatedClasses);
    setCurrentClass(updatedClass);
    
    // Also update localStorage for backward compatibility
    localStorage.setItem("classData", JSON.stringify(updatedClasses));
  };
  
  const handleOpportunityDeleted = (opportunityId: string) => {
    if (!currentClass) return;
    
    const updatedOpportunities = currentClass.bidOpportunities.filter(opp => opp.id !== opportunityId);
    
    const updatedClass: ClassConfig = {
      ...currentClass,
      bidOpportunities: updatedOpportunities
    };
    
    const updatedClasses = classes.map(c => 
      c.id === currentClass.id ? updatedClass : c
    );
    
    setClasses(updatedClasses);
    setCurrentClass(updatedClass);
    
    // Also update localStorage for backward compatibility
    localStorage.setItem("classData", JSON.stringify(updatedClasses));
  };
  
  const handleBidSubmitted = async (bidId: string, updatedStudent: Student, opportunityId: string) => {
    if (!currentClass || !auth.currentStudent) return;
    
    try {
      // Refresh the class data from the database to get the latest bid counts
      const refreshedClasses = await fetchClasses();
      const refreshedCurrentClass = refreshedClasses.find(c => c.id === currentClass.id);
      
      if (refreshedCurrentClass) {
        // Update the student in the refreshed class's students list
        const updatedStudents = refreshedCurrentClass.students.map(s => 
          s.id === updatedStudent.id ? updatedStudent : s
        );
        
        // Find the opportunity to update with the new bidder
        const updatedOpportunities = refreshedCurrentClass.bidOpportunities.map(opportunity => {
          if (opportunity.id === opportunityId) {
            // Add the student to this opportunity's bidders if not already there
            const isAlreadyBidding = opportunity.bidders.some(b => b.id === updatedStudent.id);
            const updatedBidders = isAlreadyBidding
              ? opportunity.bidders
              : [...opportunity.bidders, updatedStudent];
            
            return {
              ...opportunity,
              bidders: updatedBidders
            };
          }
          return opportunity;
        });
        
        // Also update the class-level bidders for backward compatibility
        const isAlreadyBidding = refreshedCurrentClass.bidders.some(b => b.id === updatedStudent.id);
        const updatedBidders = isAlreadyBidding
          ? refreshedCurrentClass.bidders
          : [...refreshedCurrentClass.bidders, updatedStudent];
        
        // Create the updated class
        const updatedClass: ClassConfig = {
          ...refreshedCurrentClass,
          students: updatedStudents,
          bidders: updatedBidders,
          bidOpportunities: updatedOpportunities
        };
        
        // Update the classes array
        const updatedClasses = refreshedClasses.map(c => 
          c.id === currentClass.id ? updatedClass : c
        );
        
        // Update state
        setClasses(updatedClasses);
        setCurrentClass(updatedClass);
        setAuth({
          ...auth,
          currentStudent: updatedStudent,
          currentClass: updatedClass
        });
        
        // Explicitly save to localStorage to ensure changes are persisted immediately
        localStorage.setItem("classData", JSON.stringify(updatedClasses));
      }
    } catch (error) {
      console.error("Error refreshing class data after bid:", error);
      
      // Fallback to the original logic if database refresh fails
      const updatedStudents = currentClass.students.map(s => 
        s.id === updatedStudent.id ? updatedStudent : s
      );
      
      const updatedOpportunities = currentClass.bidOpportunities.map(opportunity => {
        if (opportunity.id === opportunityId) {
          const isAlreadyBidding = opportunity.bidders.some(b => b.id === updatedStudent.id);
          const updatedBidders = isAlreadyBidding
            ? opportunity.bidders
            : [...opportunity.bidders, updatedStudent];
          
          return {
            ...opportunity,
            bidders: updatedBidders
          };
        }
        return opportunity;
      });
      
      const isAlreadyBidding = currentClass.bidders.some(b => b.id === updatedStudent.id);
      const updatedBidders = isAlreadyBidding
        ? currentClass.bidders
        : [...currentClass.bidders, updatedStudent];
      
      const updatedClass: ClassConfig = {
        ...currentClass,
        students: updatedStudents,
        bidders: updatedBidders,
        bidOpportunities: updatedOpportunities
      };
      
      const updatedClasses = classes.map(c => 
        c.id === currentClass.id ? updatedClass : c
      );
      
      setClasses(updatedClasses);
      setCurrentClass(updatedClass);
      setAuth({
        ...auth,
        currentStudent: updatedStudent,
        currentClass: updatedClass
      });
      
      localStorage.setItem("classData", JSON.stringify(updatedClasses));
    }
  };
  
  const handleRemoveClass = async (classId: string) => {
    if (!currentClass || currentClass.id !== classId) return;
    
    setDeletionInProgress(classId);
    setDeletionResult(null);
    
    try {
      // Use the atomic deletion function
      const result = await deleteClassAtomic(classId);
      setDeletionResult(result);
      
      if (result.success) {
        // Update UI state
        const updatedClasses = classes.filter(c => c.id !== classId);
        setClasses(updatedClasses);
        setCurrentClass(updatedClasses.length > 0 ? updatedClasses[0] : null);
        
        // Show success toast
        toast({
          title: "Class deleted successfully",
          description: `${result.className} and all related data have been removed`,
        });
        
        // Close dialog after a short delay to show the success message
        setTimeout(() => {
          setShowDeletionDialog(false);
          setDeletionInProgress(null);
        }, 2000);
      } else {
        // Show error toast but keep dialog open to show details
        toast({
          title: "Class deletion failed",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      
      // Set error result
      setDeletionResult({
        success: false,
        classId,
        className: currentClass.className,
        deletedRecords: { students: 0, opportunities: 0, bids: 0, tokenHistory: 0, dinnerTables: 0 },
        error: error instanceof Error ? error.message : "Unexpected error during deletion",
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Class deletion failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleChangePassword = async (classId: string, newPassword: string) => {
    try {
      await updateClass(classId, { password: newPassword });
      
      const updatedClasses = classes.map(c => {
        if (c.id === classId) {
          return { ...c, password: newPassword };
        }
        return c;
      });
      
      setClasses(updatedClasses);
      
      // Update current class if it's the one being modified
      if (currentClass && currentClass.id === classId) {
        setCurrentClass({...currentClass, password: newPassword});
      }
      
      toast({
        title: "Password updated successfully",
        description: "The class password has been updated in the database",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Failed to update password",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Show loading screen while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-heading font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Fetching data from database</p>
        </div>
      </div>
    );
  }
  
  // Render based on authentication state
  if (auth.isAdmin) {
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
                Student Bidding System - Admin
              </h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </header>
        
        {/* Sidebar */}
        <AdminSidebar
          classes={classes}
          currentClass={currentClass}
          onSelectClass={handleSelectClass}
          onCreateClass={handleCreateClass}
          isCollapsed={sidebarCollapsed}
        />
        
        <main className={`min-h-[calc(100vh-64px)] transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-80'
        }`}>
          <div className="container mx-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="selection">Selection</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard">
                <Dashboard 
                  classes={classes}
                  currentClass={currentClass}
                  onSelectClass={handleSelectClass}
                  onCreateClass={handleCreateClass}
                  onUpdateOpportunity={handleUpdateBidOpportunity}
                  onUpdateReward={handleUpdateReward}
                  onRemoveClass={(classId) => {
                    if (currentClass && currentClass.id === classId) {
                      setShowDeletionDialog(true);
                    }
                  }}
                  onChangePassword={handleChangePassword}
                  onOpportunityCreated={handleOpportunityCreated}
                  onOpportunityDeleted={handleOpportunityDeleted}
                />
              </TabsContent>
              
              <TabsContent value="students">
                <Students 
                  currentClass={currentClass}
                  onUpdateStudents={handleUpdateStudents}
                />
              </TabsContent>
              
              <TabsContent value="selection">
                <Selection 
                  currentClass={currentClass}
                  onSelectionComplete={handleSelectionComplete}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        {/* New Class Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Enter the details for the new class. This will be saved to the database.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g., Economics 101"
                  disabled={isCreatingClass}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="classPassword">Class Password</Label>
                <Input
                  id="classPassword"
                  value={newClassPassword}
                  onChange={(e) => setNewClassPassword(e.target.value)}
                  placeholder="Create a password for students"
                  disabled={isCreatingClass}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreatingClass}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNewClass}
                disabled={isCreatingClass}
              >
                {isCreatingClass ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Class"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Class Deletion Confirmation Dialog */}
        <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Confirm Class Deletion
              </DialogTitle>
              <DialogDescription>
                This will permanently delete the class and all associated data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {currentClass && (
              <div className="py-4">
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>WARNING:</strong> Deleting "{currentClass.className}" will remove:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>{currentClass.students.length} student records</li>
                      <li>{currentClass.bidOpportunities.length} bidding opportunities</li>
                      <li>All associated bids and token history</li>
                      <li>Any dinner tables created for this class</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                {deletionResult && (
                  <Alert variant={deletionResult.success ? "default" : "destructive"} className="mb-4">
                    {deletionResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {deletionResult.success ? (
                        <>
                          <strong>Success:</strong> Deleted {deletionResult.className} and:
                          <ul className="list-disc list-inside mt-1 text-sm">
                            <li>{deletionResult.deletedRecords.students} students</li>
                            <li>{deletionResult.deletedRecords.opportunities} opportunities</li>
                            <li>{deletionResult.deletedRecords.bids} bids</li>
                            <li>{deletionResult.deletedRecords.tokenHistory} token history records</li>
                            <li>{deletionResult.deletedRecords.dinnerTables} dinner tables</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <strong>Error:</strong> {deletionResult.error}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-sm text-muted-foreground mb-4">
                  <p>Type <strong>{currentClass.className}</strong> below to confirm deletion:</p>
                </div>
                
                <Input 
                  placeholder={`Type "${currentClass.className}" to confirm`}
                  className="mb-2"
                  disabled={!!deletionInProgress || (deletionResult?.success ?? false)}
                  id="confirmation-input"
                />
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeletionDialog(false);
                  setDeletionResult(null);
                }}
                disabled={!!deletionInProgress}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => currentClass && handleRemoveClass(currentClass.id)}
                disabled={
                  !!deletionInProgress || 
                  (deletionResult?.success ?? false) ||
                  (document.getElementById('confirmation-input') as HTMLInputElement)?.value !== (currentClass?.className || '')
                }
              >
                {deletionInProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Class
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  } else if (auth.isStudent && auth.currentStudent && auth.currentClass) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentDashboard 
          student={auth.currentStudent}
          classConfig={auth.currentClass}
          onBidSubmitted={handleBidSubmitted}
          onLogout={handleLogout}
        />
      </div>
    );
  }
  
  // Login screen (default)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-academy-blue mb-3">
              Student Bidding System
            </h1>
          </div>
          
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid grid-cols-2 mb-8">
              <TabsTrigger value="student">Student Login</TabsTrigger>
              <TabsTrigger value="admin">Admin Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="student" className="flex justify-center">
              <StudentLogin 
                classes={classes}
                onLogin={(success) => {
                  if (success) {
                    // State is updated in the component through auth utilities
                    handleStudentLogin(success);
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="admin" className="flex justify-center">
              <AdminLoginForm onLogin={handleAdminLogin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <footer className="border-t bg-white py-4 text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          Student Bidding System &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Index;