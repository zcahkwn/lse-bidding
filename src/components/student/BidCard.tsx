import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Coins, CheckCircle, AlertTriangle } from "lucide-react";
import { Student, ClassConfig, BidOpportunity } from "@/types";
import { useStudentBidding } from "@/hooks/useStudentBidding";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";

interface BidCardProps {
  student: Student;
  classConfig: ClassConfig;
  onPlaceBid: (student: Student, opportunityId: string) => void;
}

const BidCard = ({ student, classConfig, onPlaceBid }: BidCardProps) => {
  const [activeTab, setActiveTab] = useState("opportunity-0");
  const { isSubmitting, student: currentStudent, lastBidResponse, error, submitBid } = useStudentBidding(student);
  
  const bidOpportunities = classConfig.bidOpportunities || [];

  // Update parent component when student status changes
  useEffect(() => {
    if (currentStudent && currentStudent.hasUsedToken !== student.hasUsedToken) {
      // Notify parent of student status change
      onPlaceBid(currentStudent, ''); // Empty opportunity ID for status update
    }
  }, [currentStudent, student, onPlaceBid]);

  const handleSubmitBid = async (opportunityId: string) => {
    if (!currentStudent || currentStudent.hasUsedToken) return;

    const response = await submitBid({
      studentId: currentStudent.id,
      opportunityId,
      classPassword: classConfig.password
    });

    if (response.success && response.updatedStudent) {
      // Notify parent component of successful bid
      onPlaceBid(response.updatedStudent, opportunityId);
    }
  };

  if (bidOpportunities.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-heading">{classConfig.rewardTitle}</CardTitle>
          <CardDescription>{classConfig.rewardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">No bid opportunities available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl font-heading flex items-center gap-2">
          <Coins className="w-5 h-5" />
          {classConfig.rewardTitle}
        </CardTitle>
        <CardDescription>{classConfig.rewardDescription}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Token Status Display */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium">Your token:</span>
            {currentStudent?.hasUsedToken ? (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Token Unavailable
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">
                Token Available
              </Badge>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {lastBidResponse?.success && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Bid submitted successfully! Your token has been used.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bid Opportunities */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            {bidOpportunities.map((opportunity, index) => (
              <TabsTrigger key={opportunity.id} value={`opportunity-${index}`}>
                #{index + 1}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {bidOpportunities.map((opportunity, index) => {
            const hasStudentBid = opportunity.bidders?.some(bidder => bidder.id === currentStudent?.id);
            const isStudentSelected = opportunity.selectedStudents?.some(s => s.id === currentStudent?.id);
            const canSubmitBid = !currentStudent?.hasUsedToken && 
                               getBidOpportunityStatus(opportunity) === "Open for Bidding" &&
                               !hasStudentBid;

            return (
              <TabsContent key={opportunity.id} value={`opportunity-${index}`}>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg">{opportunity.title}</h3>
                    <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Date:</span>
                    <span className="font-medium">{formatDate(opportunity.date)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Status:</span>
                    <Badge variant={getBidOpportunityStatus(opportunity) === "Open for Bidding" ? "default" : "secondary"}>
                      {getBidOpportunityStatus(opportunity)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Capacity:</span>
                    <Badge variant="outline">{classConfig.capacity} students</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current bids:</span>
                    <Badge variant="outline">{opportunity.bidders?.length || 0} students</Badge>
                  </div>
                  
                  {/* Selection result information */}
                  {hasStudentBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Your result:</span>
                      {isStudentSelected ? (
                        <Badge className="bg-green-500">Selected</Badge>
                      ) : opportunity.selectedStudents?.length > 0 ? (
                        <Badge variant="secondary">Not Selected</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  )}
                  
                  {isStudentSelected && (
                    <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200">
                      <div className="text-green-600 font-medium">
                        Congratulations! You have been selected for this dinner!
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full mt-4" 
                    disabled={!canSubmitBid || isSubmitting}
                    onClick={() => handleSubmitBid(opportunity.id)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : hasStudentBid ? (
                      "Bid Placed"
                    ) : currentStudent?.hasUsedToken ? (
                      "Token Unavailable"
                    ) : getBidOpportunityStatus(opportunity) !== "Open for Bidding" ? (
                      "Not Open for Bidding"
                    ) : (
                      "Use Token to Bid"
                    )}
                  </Button>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BidCard;