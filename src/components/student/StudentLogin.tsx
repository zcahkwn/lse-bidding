import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authenticateStudent, createStudentAuthState } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { ClassConfig, Student } from "@/types";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, ChevronRight } from "lucide-react";

interface StudentLoginProps {
  classes: ClassConfig[];
  onLogin: (success: boolean) => void;
}

const StudentLogin = ({ classes, onLogin }: StudentLoginProps) => {
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassConfig[]>([]);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);
  const [showClassSelection, setShowClassSelection] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const authResult = authenticateStudent(email, studentNumber, classes);
      
      if (authResult.success && authResult.student && authResult.enrolledClasses.length > 0) {
        setAuthenticatedStudent(authResult.student);
        setEnrolledClasses(authResult.enrolledClasses);
        
        if (authResult.enrolledClasses.length === 1) {
          // If only enrolled in one class, go directly to dashboard
          handleClassSelection(authResult.enrolledClasses[0]);
        } else {
          // Show class selection if enrolled in multiple classes
          setShowClassSelection(true);
          toast({
            title: "Authentication successful",
            description: `Found ${authResult.enrolledClasses.length} classes you're enrolled in`,
          });
        }
      } else {
        toast({
          title: "Login failed",
          description: authResult.errorMessage || "Invalid email or student number. Please check your credentials.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 800);
  };

  const handleClassSelection = (selectedClass: ClassConfig) => {
    if (!authenticatedStudent) return;

    // Create auth state for the selected class
    const authState = createStudentAuthState(authenticatedStudent, selectedClass);
    
    toast({
      title: "Login successful",
      description: `Welcome to ${selectedClass.className}, ${authenticatedStudent.name}!`,
    });
    
    onLogin(true);
    
    // Navigate to the student dashboard with auth data
    navigate("/student", { 
      state: { 
        student: authenticatedStudent,
        classConfig: selectedClass,
        enrolledClasses: enrolledClasses // Pass all enrolled classes for potential class switching
      }
    });
  };

  const handleBackToLogin = () => {
    setShowClassSelection(false);
    setAuthenticatedStudent(null);
    setEnrolledClasses([]);
    setEmail("");
    setStudentNumber("");
  };

  if (showClassSelection) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-heading">Select Your Class</CardTitle>
          <CardDescription>
            You're enrolled in multiple classes. Choose which one to access:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {enrolledClasses.map((classConfig) => {
              const studentInClass = classConfig.students.find(s => s.id === authenticatedStudent?.id);
              const hasUsedToken = studentInClass?.hasUsedToken || false;
              const activeBidOpportunities = classConfig.bidOpportunities?.filter(opp => 
                new Date(opp.date) > new Date()
              ).length || 0;

              return (
                <Card 
                  key={classConfig.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                  onClick={() => handleClassSelection(classConfig)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <h3 className="font-semibold text-lg">{classConfig.className}</h3>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>{classConfig.students.length} students enrolled</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span>Token Status:</span>
                            <Badge variant={hasUsedToken ? "secondary" : "default"} className="text-xs">
                              {hasUsedToken ? "Used" : "Available"}
                            </Badge>
                          </div>
                          
                          {activeBidOpportunities > 0 && (
                            <div className="text-blue-600 font-medium">
                              {activeBidOpportunities} active opportunity{activeBidOpportunities > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Alert>
            <AlertDescription>
              You can switch between classes anytime from your dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleBackToLogin} className="w-full">
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-heading">Student Login</CardTitle>
        <CardDescription>
          Enter your email address and student number to access your classes
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentNumber">Student Number</Label>
            <Input
              id="studentNumber"
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="Enter your student number"
              required
              disabled={isLoading}
            />
          </div>
          
          <Alert>
            <AlertDescription>
              <strong>New:</strong> No class password needed! You'll see all classes you're enrolled in after logging in.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default StudentLogin;