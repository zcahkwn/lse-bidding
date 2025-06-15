import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { BidOpportunity, ClassConfig } from "@/types";
import { createBidOpportunity, deleteBidOpportunity } from "@/lib/classService";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";

interface BidOpportunityManagerProps {
  currentClass: ClassConfig | null;
  onOpportunityCreated: (opportunity: BidOpportunity) => void;
  onOpportunityDeleted: (opportunityId: string) => void;
  onEditOpportunity: (opportunity: BidOpportunity) => void;
}

const BidOpportunityManager = ({
  currentClass,
  onOpportunityCreated,
  onOpportunityDeleted,
  onEditOpportunity
}: BidOpportunityManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [bidOpenDate, setBidOpenDate] = useState<Date | undefined>(undefined);
  const [capacity, setCapacity] = useState(currentClass?.capacity || 7);
  
  const { toast } = useToast();
  
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(undefined);
    setBidOpenDate(undefined);
    setCapacity(currentClass?.capacity || 7);
  };
  
  const handleCreateOpportunity = async () => {
    if (!currentClass || !title || !description || !eventDate || !bidOpenDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const newOpportunity = await createBidOpportunity(currentClass.id, {
        title,
        description,
        event_date: eventDate.toISOString(),
        opens_at: bidOpenDate.toISOString(),
        closes_at: eventDate.toISOString(),
        capacity
      });
      
      onOpportunityCreated(newOpportunity);
      
      toast({
        title: "Opportunity created",
        description: "The bidding opportunity has been created successfully",
      });
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      toast({
        title: "Failed to create opportunity",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDeleteOpportunity = async (opportunityId: string) => {
    setIsDeleting(opportunityId);
    
    try {
      await deleteBidOpportunity(opportunityId);
      onOpportunityDeleted(opportunityId);
      
      toast({
        title: "Opportunity deleted",
        description: "The bidding opportunity has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      toast({
        title: "Failed to delete opportunity",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };
  
  if (!currentClass) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl mb-4">No class selected</h2>
          <p className="text-muted-foreground">Please select a class to manage bidding opportunities.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Bidding Opportunities</CardTitle>
            <CardDescription>
              Manage bidding opportunities for {currentClass.className}
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Opportunity
          </Button>
        </CardHeader>
        <CardContent>
          {currentClass.bidOpportunities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No bidding opportunities have been created yet.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Opportunity
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Bidding Opens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bidders</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentClass.bidOpportunities.map((opportunity) => (
                  <TableRow key={opportunity.id}>
                    <TableCell className="font-medium">{opportunity.title}</TableCell>
                    <TableCell>{formatDate(opportunity.date)}</TableCell>
                    <TableCell>
                      {opportunity.bidOpenDate ? formatDate(opportunity.bidOpenDate) : "1 week before"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBidOpportunityStatus(opportunity) === "Open for Bidding" ? "default" : "secondary"}>
                        {getBidOpportunityStatus(opportunity)}
                      </Badge>
                    </TableCell>
                    <TableCell>{opportunity.bidders.length}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEditOpportunity(opportunity)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteOpportunity(opportunity.id)}
                          disabled={isDeleting === opportunity.id}
                        >
                          {isDeleting === opportunity.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create Opportunity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Bidding Opportunity</DialogTitle>
            <DialogDescription>
              Add a new bidding opportunity for students to participate in
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dinner with Professor - Week 1"
                disabled={isCreating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the opportunity in detail"
                rows={3}
                disabled={isCreating}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isCreating}
                  >
                    {eventDate ? format(eventDate, "PPP") : <span>Pick the event date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Bidding Opens Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isCreating}
                  >
                    {bidOpenDate ? format(bidOpenDate, "PPP") : <span>Pick when bidding opens</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bidOpenDate}
                    onSelect={setBidOpenDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                This is when students can start bidding for this opportunity
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  disabled={isCreating}
                />
                <span className="text-sm text-muted-foreground">students</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateOpportunity} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Opportunity"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BidOpportunityManager;