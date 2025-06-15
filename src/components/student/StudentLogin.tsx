import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticateStudentWithBoth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { ClassConfig } from "@/types";
import { useNavigate } from "react-router-dom";

interface StudentLoginProps {
  classes: ClassConfig[];
  onLogin: (success: boolean) => void;
}

const StudentLogin = ({ classes, onLogin }: StudentLoginProps) => {
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const authState = authenticateStudentWithBoth(email, studentNumber, password, classes);
      
      if (authState.isStudent) {
        toast({
          title: "Login successful",
          description: `Welcome, ${authState.currentStudent?.name}!`,
        });
        onLogin(true);
        
        // Navigate to the student dashboard with auth data
        navigate("/student", { 
          state: { 
            student: authState.currentStudent,
            classConfig: authState.currentClass
          }
        });
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email, student number, or class password. Please check all fields.",
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
          Enter your email address, student number, and class password to access your account
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
          <div className="space-y-2">
            <Label htmlFor="password">Class Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your class password"
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