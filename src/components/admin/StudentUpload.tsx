
import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@/types";

interface StudentUploadProps {
  onUpload: (students: Student[]) => void;
}

const StudentUpload = ({ onUpload }: StudentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): Student[] => {
    // Split the CSV text into rows and then into columns
    const rows = text.trim().split("\n");
    
    // Parse the header row to determine indices
    const headerRow = rows[0].split(",");
    const nameIndex = headerRow.findIndex(col => 
      col.toLowerCase().trim() === "name" || col.toLowerCase().trim() === "student name"
    );
    const emailIndex = headerRow.findIndex(col => 
      col.toLowerCase().trim() === "email" || col.toLowerCase().trim() === "email address"
    );
    
    if (nameIndex === -1 || emailIndex === -1) {
      throw new Error("CSV file must include 'Name' and 'Email' columns");
    }
    
    // Parse data rows
    const students: Student[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      const columns = rows[i].split(",");
      if (columns.length <= Math.max(nameIndex, emailIndex)) continue; // Skip malformed rows
      
      students.push({
        id: `student-${i}`,
        name: columns[nameIndex].trim(),
        email: columns[emailIndex].trim().toLowerCase(),
        hasUsedToken: false,
        hasBid: false
      });
    }
    
    return students;
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      const students = parseCSV(text);
      
      if (students.length === 0) {
        toast({
          title: "No students found",
          description: "The CSV file does not contain any valid student data",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      
      toast({
        title: "Upload successful",
        description: `${students.length} students imported`,
      });
      
      onUpload(students);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-heading">Import Students</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csvFile">Upload CSV File</Label>
          <Input 
            id="csvFile" 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <p className="text-sm text-muted-foreground">
            File should contain columns for student name and email address
          </p>
        </div>
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? "Uploading..." : "Upload Students"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StudentUpload;
