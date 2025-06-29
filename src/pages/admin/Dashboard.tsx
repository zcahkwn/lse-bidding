import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import EditBidOpportunityDialog from "@/components/admin/EditBidOpportunityDialog";
import { useRealtimeBidTracking } from "@/hooks/useRealtimeBidTracking";
import { Trash2, AlertTriangle, Users, Coins, Settings, Plus, Edit, Info, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { createBidOpportunity, deleteBidOpportunity } from "@/lib/classService";

interface DashboardProps {
  classes: ClassConfig[];
  currentClass: ClassConfig | null;
  onSelectClass: (classId: string) => void;
  onCreateClass: () => void;
  onUpdateOpportunity: (opportunityId: string, updatedOpportunity: BidOpportunity) => void;
  onUpdateReward: (config: Partial<ClassConfig>) => void;
  onRemoveClass?: (classId: string) => void;
  onChangePassword?: (classId: string, newPassword: string) => void;
  onOpportunityCreated?: (opportunity: BidOpportunity) => void;
  onOpportunityDeleted?: (opportunityId: string) => void;
}

const Dashboard = ({ 
  classes, 
  currentClass, 
  onSelectClass, 
  onCreateClass,
  onUpdateOpportunity,
  onUpdateReward,
  onRemoveClass,
  onChangePassword,
  onOpportunityCreated,
  onOpportunityDeleted
}: DashboardProps) => {
  const { toast } = useToast();
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<BidOpportunity | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [showCreateOpportunityDialog, setShowCreateOpportunityDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Create opportunity form state
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [bidOpenDate, setBidOpenDate] = useState<Date | undefined>(undefined);
  const [capacity, setCapacity] = useState<string>("");

  // Use real-time bid tracking
  const { statistics, isLoading: statsLoading, refresh: refreshStats } = useRealtimeBidTracking(currentClass?.id || null);
  
  // Get the selected opportunity if there is one
  const selectedOpportunity = currentClass?.bidOpportunities?.find(
    opp => opp.id === selectedOpportunityId
  );
  
  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(undefined);
    setBidOpenDate(undefined);
    setCapacity("");
  };

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing the field
    if (value === "") {
      setCapacity("");
      return;
    }
    
    // Only allow non-negative integers (including zero)
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setCapacity(value);
    }
  };

  const handleCapacityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if ([8, 9, 27, 13, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
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
  
  const handleCreateOpportunity = async () => {
    const capacityValue = parseInt(capacity, 10);
    
    if (!currentClass || !title || !description || !eventDate || !bidOpenDate || isNaN(capacityValue) || capacityValue < 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields with valid values",
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
        capacity: capacityValue
      });
      
      onOpportunityCreated?.(newOpportunity);
      
      toast({
        title: "Opportunity created",
        description: "The bidding opportunity has been created successfully",
      });
      
      resetCreateForm();
      setShowCreateOpportunityDialog(false);
      
      // Refresh statistics to show the new opportunity
      refreshStats();
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
      onOpportunityDeleted?.(opportunityId);
      
      toast({
        title: "Opportunity deleted",
        description: "The bidding opportunity has been deleted successfully",
      });
      
      // Refresh statistics after deletion
      refreshStats();
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
  
  const handleEditOpportunity = (opportunity: BidOpportunity) => {
    setEditingOpportunity(opportunity);
  };
  
  const handleSaveOpportunity = (updatedOpportunity: BidOpportunity, updatedClass: Partial<ClassConfig>) => {
    if (!currentClass) return;
    
    // Update the opportunity
    onUpdateOpportunity(updatedOpportunity.id, updatedOpportunity);
    
    // Update the class reward configuration
    onUpdateReward(updatedClass);
    
    // Refresh statistics to show updated data
    refreshStats();
    
    toast({
      title: "Changes saved",
      description: `The bidding opportunity and reward details have been updated`,
    });
  };

  const handleChangePassword = () => {
    if (!currentClass || !newPassword) return;
    
    if (onChangePassword) {
      onChangePassword(currentClass.id, newPassword);
      setNewPassword("");
      setShowPasswordDialog(false);
      
      toast({
        title: "Password changed",
        description: `The password for ${currentClass.className} has been updated successfully`,
      });
    }
  };

  const handleRemoveClass = () => {
    if (!currentClass) return;
    
    // Validate confirmation text
    if (confirmDelete !== currentClass.className) {
      toast({
        title: "Confirmation failed",
        description: "Please type the class name exactly to confirm deletion",
        variant: "destructive",
      });
      return;
    }
    
    if (onRemoveClass) {
      onRemoveClass(currentClass.id);
      setConfirmDelete("");
      setShowRemoveConfirmDialog(false);
    }
  };

  // Get real-time bid count for a specific opportunity
  const getOpportunityBidCount = (opportunityId: string): number => {
    // Add null check for statistics to prevent TypeError
    if (!statistics || !statistics.opportunities) {
      return 0;
    }
    
    const opportunityStats = statistics.opportunities.find(opp => opp.opportunityId === opportunityId);
    return opportunityStats?.bidCount || 0;
  };

  if (!currentClass) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
          <Button onClick={onCreateClass}>Create New Class</Button>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-lg mb-4">No class selected.</p>
            <p className="text-muted-foreground mb-4">
              Select a class from the sidebar to view its details and manage it.
            </p>
            {classes.length === 0 && (
              <Button onClick={onCreateClass}>Create Your First Class</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold">Class Management</h1>
          <p className="text-muted-foreground text-lg">Managing: {currentClass.className}</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={refreshStats}
            disabled={statsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Change Password
          </Button>
          <Button 
            variant="destructive"
            onClick={() => setShowRemoveConfirmDialog(true)}
            className="flex items-center gap-2"
          >
            <Trash2 size={16} /> Remove Class
          </Button>
        </div>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statistics?.totalStudents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Tokens</CardTitle>
            <Coins className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statistics?.studentsWithTokens || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to bid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bidders</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statistics?.studentsWhoBid || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Have placed bids
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Class Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Class Details</CardTitle>
          <CardDescription>
            Configuration and settings for {currentClass.className}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-500">Class Name</Label>
              <p className="text-lg font-semibold mt-1">{currentClass.className}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Class Password</Label>
              <p className="text-lg font-mono bg-gray-100 px-3 py-1 rounded mt-1">{currentClass.password}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Total Bids</Label>
              <p className="text-lg font-semibold mt-1 text-blue-600">
                {statsLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : statistics?.totalBids || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bidding Opportunities Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold">Bidding Opportunities</h2>
            <p className="text-muted-foreground">Manage bidding opportunities for {currentClass.className}</p>
          </div>
          <Button 
            onClick={() => setShowCreateOpportunityDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Opportunity
          </Button>
        </div>

        {currentClass.bidOpportunities && currentClass.bidOpportunities.length > 0 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Bidding Opens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Bids</TableHead>
                      <TableHead>Selected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClass.bidOpportunities.map((opportunity) => {
                      const realTimeBidCount = getOpportunityBidCount(opportunity.id);
                      
                      return (
                        <>
                          <TableRow 
                            key={opportunity.id}
                            className={selectedOpportunityId === opportunity.id ? "bg-academy-lightBlue/10" : ""}
                          >
                            <TableCell className="font-medium">{opportunity.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {opportunity.capacity || currentClass.capacity} students
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(opportunity.date)}</TableCell>
                            <TableCell>{opportunity.bidOpenDate ? formatDate(opportunity.bidOpenDate) : "1 week before"}</TableCell>
                            <TableCell>
                              <Badge variant={getBidOpportunityStatus(opportunity) === "Open for Bidding" ? "default" : "secondary"}>
                                {getBidOpportunityStatus(opportunity)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-blue-500">
                                  {statsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : realTimeBidCount}
                                </Badge>
                                {realTimeBidCount > (opportunity.capacity || currentClass.capacity) && (
                                  <Badge variant="destructive" className="text-xs">
                                    Over capacity
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{opportunity.selectedStudents?.length || 0}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedOpportunityId(
                                    selectedOpportunityId === opportunity.id ? null : opportunity.id
                                  )}
                                  className="flex items-center gap-1"
                                >
                                  {selectedOpportunityId === opportunity.id ? (
                                    <>
                                      <EyeOff className="w-4 h-4" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditOpportunity(opportunity);
                                  }}
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

                          {/* Selected Opportunity Details */}
                          {selectedOpportunityId === opportunity.id && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-blue-50/50 border-l-4 border-l-academy-blue p-6">
                                  <h3 className="text-lg font-semibold mb-4 text-academy-blue">
                                    Real-time Details: {opportunity.title}
                                  </h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                                      <div className="mt-2 p-3 bg-white rounded-md border">
                                        <p className="text-gray-800">{opportunity.description}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-600">Live Statistics</Label>
                                      <div className="mt-2 space-y-3">
                                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                                          <span className="text-sm text-gray-600">Current Bids:</span>
                                          <span className="font-medium text-blue-600">
                                            {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : realTimeBidCount}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                                          <span className="text-sm text-gray-600">Capacity:</span>
                                          <span className="font-medium text-purple-600">
                                            {opportunity.capacity || currentClass.capacity} students
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                                          <span className="text-sm text-gray-600">Status:</span>
                                          <Badge variant={realTimeBidCount > (opportunity.capacity || currentClass.capacity) ? "destructive" : "default"}>
                                            {realTimeBidCount > (opportunity.capacity || currentClass.capacity) 
                                              ? "Over Capacity" 
                                              : realTimeBidCount === (opportunity.capacity || currentClass.capacity)
                                              ? "At Capacity"
                                              : "Available Spots"
                                            }
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Capacity Status Indicator */}
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="text-sm font-medium text-gray-600">Live Capacity Status</Label>
                                      <span className="text-sm text-gray-500">
                                        {realTimeBidCount} / {opportunity.capacity || currentClass.capacity} students
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          realTimeBidCount > (opportunity.capacity || currentClass.capacity)
                                            ? 'bg-red-500' 
                                            : realTimeBidCount === (opportunity.capacity || currentClass.capacity)
                                            ? 'bg-yellow-500'
                                            : 'bg-green-500'
                                        }`}
                                        style={{ 
                                          width: `${Math.min((realTimeBidCount / (opportunity.capacity || currentClass.capacity)) * 100, 100)}%` 
                                        }}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {realTimeBidCount > (opportunity.capacity || currentClass.capacity)
                                        ? `${realTimeBidCount - (opportunity.capacity || currentClass.capacity)} students over capacity - random selection will be required`
                                        : realTimeBidCount === (opportunity.capacity || currentClass.capacity)
                                        ? "At full capacity - all bidders can be selected"
                                        : `${(opportunity.capacity || currentClass.capacity) - realTimeBidCount} spots remaining`
                                      }
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No Bidding Opportunities</h3>
              <p className="text-muted-foreground mb-4">
                Create your first bidding opportunity to get started.
              </p>
              <Button onClick={() => setShowCreateOpportunityDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Opportunity
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Opportunity Dialog */}
      <Dialog open={showCreateOpportunityDialog} onOpenChange={setShowCreateOpportunityDialog}>
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
                  type="text"
                  value={capacity}
                  onChange={handleCapacityChange}
                  onKeyDown={handleCapacityKeyDown}
                  placeholder="0"
                  disabled={isCreating}
                  required
                />
                <span className="text-sm text-muted-foreground">students</span>
              </div>
              <p className="text-xs text-muted-foreground">
                0 or any positive number of students for this opportunity
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOpportunityDialog(false)} disabled={isCreating}>
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

      {/* Edit Bid Opportunity Dialog */}
      {editingOpportunity && (
        <EditBidOpportunityDialog
          isOpen={!!editingOpportunity}
          onClose={() => setEditingOpportunity(null)}
          opportunity={editingOpportunity}
          currentClass={currentClass}
          onSave={handleSaveOpportunity}
        />
      )}

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Class Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {currentClass?.className}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>
              Save Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Class Confirmation Dialog */}
      <Dialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove Class
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {currentClass?.className} and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {currentClass && (
            <div className="py-4">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>WARNING:</strong> Deleting this class will remove:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{statistics?.totalStudents || 0} student records</li>
                    <li>{currentClass.bidOpportunities.length} bidding opportunities</li>
                    <li>{statistics?.totalBids || 0} bids and token history</li>
                    <li>Any dinner tables created for this class</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 mb-4">
                <Label htmlFor="confirm-delete">Type <strong>{currentClass.className}</strong> to confirm:</Label>
                <Input
                  id="confirm-delete"
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder={`Type "${currentClass.className}" to confirm`}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRemoveConfirmDialog(false);
              setConfirmDelete("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveClass}
              disabled={confirmDelete !== (currentClass?.className || '')}
            >
              Delete Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;