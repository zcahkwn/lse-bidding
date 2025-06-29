import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClassConfig, Student } from "@/types";
import { useNavigate } from "react-router-dom";

interface StudentLoginProps {
  classes: ClassConfig[];
  onLogin: (success: boolean) => void;
}

const StudentLogin = ({ classes, onLogin }: StudentLoginProps) => {
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Find all classes where the student is enrolled
      const studentClasses: ClassConfig[] = [];
      let foundStudent: Student | null = null;

      classes.forEach(classConfig => {
        const student = classConfig.students.find(s => 
          s.email.toLowerCase() === email.toLowerCase() &&
          s.studentNumber && 
          s.studentNumber.toLowerCase() === studentNumber.toLowerCase()
        );
        
        if (student) {
          studentClasses.push(classConfig);
          if (!foundStudent) {
            foundStudent = student;
          }
        }
      });
      
      if (foundStudent && studentClasses.length > 0) {
        toast({
          title: "Login successful",
          description: `Welcome, ${foundStudent.name}! Found ${studentClasses.length} class${studentClasses.length > 1 ? 'es' : ''}.`,
        });
        onLogin(true);
        
        // Navigate to the student dashboard with auth data
        navigate("/student", { 
          state: { 
            student: foundStudent,
            classes: studentClasses
          }
        });
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or student number. Please check your credentials.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 800);
  };

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