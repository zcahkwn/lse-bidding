import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays } from "date-fns";
import { BidOpportunity, ClassConfig } from "@/types";
import { formatDate } from "@/utils/dates";
import { updateBidOpportunity } from "@/lib/classService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditBidOpportunityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: BidOpportunity | null;
  currentClass: ClassConfig | null;
  onSave: (updatedOpportunity: BidOpportunity, updatedClass: Partial<ClassConfig>) => void;
}

const EditBidOpportunityDialog = ({
  isOpen,
  onClose,
  opportunity,
  currentClass,
  onSave
}: EditBidOpportunityDialogProps) => {
  const [title, setTitle] = useState(opportunity?.title || "");
  const [description, setDescription] = useState(opportunity?.description || "");
  const [date, setDate] = useState<Date | undefined>(
    opportunity ? new Date(opportunity.date) : undefined
  );
  const [biddingOpenDate, setBiddingOpenDate] = useState<Date | undefined>(
    opportunity ? addDays(new Date(opportunity.date), -7) : undefined
  );
  const [capacity, setCapacity] = useState(opportunity?.capacity || currentClass?.capacity);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  
  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setCapacity(value);
    } else if (e.target.value === "") {
      setCapacity(0);
    }
  };

  const handleCapacityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 35, 36, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };
  
  const handleSave = async () => {
    if (!opportunity || !date || !biddingOpenDate || !currentClass || !capacity) return;
    
    setIsSaving(true);
    
    try {
      // Update the opportunity in the database
      await updateBidOpportunity(opportunity.id, {
        title,
        description,
        event_date: date.toISOString(),
        opens_at: biddingOpenDate.toISOString(),
        closes_at: date.toISOString(),
        capacity
      });

      // Create updated objects for local state
      const updatedOpportunity: BidOpportunity = {
        ...opportunity,
        title,
        description,
        date: date.toISOString(),
        bidOpenDate: biddingOpenDate.toISOString(),
        capacity
      };

      const updatedClass: Partial<ClassConfig> = {
        // Don't update class-level settings, just pass empty object
      };
      
      // Update local state
      onSave(updatedOpportunity, updatedClass);
      
      toast({
        title: "Changes saved successfully",
        description: "The bidding opportunity has been updated.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Failed to save changes",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bidding Opportunity</DialogTitle>
          <DialogDescription>
            Modify the details for this bidding opportunity
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Opportunity Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Opportunity Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isSaving}
                  >
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
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
                    disabled={isSaving}
                  >
                    {biddingOpenDate ? format(biddingOpenDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={biddingOpenDate}
                    onSelect={setBiddingOpenDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                This is the date when students can start bidding for this opportunity
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity for this Opportunity</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={handleCapacityChange}
                  onKeyDown={handleCapacityKeyDown}
                  disabled={isSaving}
                  required
                />        
                <span className="text-sm text-muted-foreground">students</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBidOpportunityDialog;