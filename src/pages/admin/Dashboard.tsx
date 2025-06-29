import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import EditBidOpportunityDialog from "@/components/admin/EditBidOpportunityDialog";
import { createBidOpportunity } from "@/lib/classService";
import { Trash2, AlertTriangle, Users, Coins, Calendar as CalendarIcon, Settings, Plus, Edit, Eye, EyeOff, Loader2, Info } from "lucide-react";
import { format } from "date-fns";

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
  const [editingOpportunity, setEditingOpportunity] = useState<BidOpportunity | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [showCreateOpportunityDialog, setShowCreateOpportunityDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<BidOpportunity | null>(null);
  const [expandedOpportunityId, setExpandedOpportunityId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  
  // Form state for creating new opportunity
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [bidOpenDate, setBidOpenDate] = useState<Date | undefined>(undefined);
  const [capacity, setCapacity] = useState(currentClass?.capacity || 7);
  
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
      
      if (onOpportunityCreated) {
        onOpportunityCreated(newOpportunity);
      }
      
      toast({
        title: "Opportunity created",
        description: "The bidding opportunity has been created successfully",
      });
      
      resetForm();
      setShowCreateOpportunityDialog(false);
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
  
  const handleEditOpportunity = (opportunity: BidOpportunity) => {
    setEditingOpportunity(opportunity);
  };
  
  const handleDeleteOpportunity = (opportunity: BidOpportunity) => {
    setOpportunityToDelete(opportunity);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteOpportunity = () => {
    if (opportunityToDelete && onOpportunityDeleted) {
      onOpportunityDeleted(opportunityToDelete.id);
      setShowDeleteConfirmDialog(false);
      setOpportunityToDelete(null);
      
      toast({
        title: "Opportunity deleted",
        description: `${opportunityToDelete.title} has been removed successfully`,
      });
    }
  };

  const toggleOpportunityDetails = (opportunityId: string) => {
    setExpandedOpportunityId(
      expandedOpportunityId === opportunityId ? null : opportunityId
    );
  };
  
  const handleSaveOpportunity = (updatedOpportunity: BidOpportunity, updatedClass: Partial<ClassConfig>) => {
    if (!currentClass) return;
    
    // Update the opportunity
    onUpdateOpportunity(updatedOpportunity.id, updatedOpportunity);
    
    // Update the class reward configuration
    onUpdateReward(updatedClass);
    
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentClass.students.length}</div>
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
              {currentClass.students.filter(s => !s.hasUsedToken).length}
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
              {currentClass.bidders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Have placed bids
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
            <CalendarIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {currentClass.capacity}
            </div>
            <p className="text-xs text-muted-foreground">
              Max students per event
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
              <Label className="text-sm font-medium text-gray-500">Bid Opportunities</Label>
              <p className="text-lg font-semibold mt-1">{currentClass.bidOpportunities?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unified Bidding Opportunities Section */}
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
                      <TableHead>Event Date</TableHead>
                      <TableHead>Bidding Opens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bidders</TableHead>
                      <TableHead>Selected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClass.bidOpportunities.map((opportunity) => (
                      <>
                        <TableRow 
                          key={opportunity.id}
                          className={expandedOpportunityId === opportunity.id ? "bg-academy-lightBlue/10" : ""}
                        >
                          <TableCell className="font-medium">{opportunity.title}</TableCell>
                          <TableCell>{formatDate(opportunity.date)}</TableCell>
                          <TableCell>{opportunity.bidOpenDate ? formatDate(opportunity.bidOpenDate) : "1 week before"}</TableCell>
                          <TableCell>
                            <Badge variant={getBidOpportunityStatus(opportunity) === "Open for Bidding" ? "default" : "secondary"}>
                              {getBidOpportunityStatus(opportunity)}
                            </Badge>
                          </TableCell>
                          <TableCell>{opportunity.bidders.length}</TableCell>
                          <TableCell>{opportunity.selectedStudents?.length || 0}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => toggleOpportunityDetails(opportunity.id)}
                                className="flex items-center gap-1"
                              >
                                {expandedOpportunityId === opportunity.id ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOpportunity(opportunity);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Student Overview Section - Only shown when expanded */}
                        {expandedOpportunityId === opportunity.id && (
                          <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <div className="bg-blue-50/50 border-l-4 border-l-academy-blue p-6">
                                <h3 className="text-lg font-semibold mb-4 text-academy-blue flex items-center gap-2">
                                  <Info className="w-5 h-5" />
                                  Student Overview: {opportunity.title}
                                </h3>
                                
                                {/* Opportunity Description */}
                                <div className="mb-6 p-4 bg-white rounded-md border border-blue-100">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description:</h4>
                                  <p className="text-gray-600">{opportunity.description}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Active Bidders */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2 text-base">
                                        <Users className="w-5 h-5" />
                                        Active Bidders
                                      </CardTitle>
                                      <CardDescription>
                                        Students who have placed bids for this opportunity
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      {opportunity.bidders.length === 0 ? (
                                        <div className="text-center py-4">
                                          <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                          <p className="text-muted-foreground">No bids placed yet</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-3 max-h-40 overflow-y-auto">
                                          {opportunity.bidders.map((student) => (
                                            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                              <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-sm text-muted-foreground">{student.email}</div>
                                              </div>
                                              <Badge variant="outline">Bidder</Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                  
                                  {/* Selected Students */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2 text-base">
                                        <Users className="w-5 h-5 text-green-600" />
                                        Selected Students
                                      </CardTitle>
                                      <CardDescription>
                                        Students who were selected for this opportunity
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      {opportunity.selectedStudents?.length === 0 || !opportunity.selectedStudents ? (
                                        <div className="text-center py-4">
                                          <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                          <p className="text-muted-foreground">No students selected yet</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-3 max-h-40 overflow-y-auto">
                                          {opportunity.selectedStudents.map((student) => (
                                            <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                              <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-sm text-muted-foreground">{student.email}</div>
                                              </div>
                                              <Badge className="bg-green-500">Selected</Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
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

      {/* Create New Opportunity Dialog */}
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

      {/* Delete Opportunity Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Bidding Opportunity
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{opportunityToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>WARNING:</strong> Deleting this opportunity will also remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All bids placed for this opportunity ({opportunityToDelete?.bidders.length || 0} bids)</li>
                <li>Any selection results for this opportunity</li>
                <li>Associated token history records</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirmDialog(false);
              setOpportunityToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteOpportunity}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <li>{currentClass.students.length} student records</li>
                    <li>{currentClass.bidOpportunities.length} bidding opportunities</li>
                    <li>All associated bids and token history</li>
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