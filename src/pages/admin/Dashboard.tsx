import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import EditBidOpportunityDialog from "@/components/admin/EditBidOpportunityDialog";
import BidOpportunityManager from "@/components/admin/BidOpportunityManager";
import { Trash2, AlertTriangle, Users, Coins, Calendar, Settings, Plus, Edit, Info, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
  const [showOpportunityManager, setShowOpportunityManager] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  
  // Get the selected opportunity if there is one
  const selectedOpportunity = currentClass?.bidOpportunities?.find(
    opp => opp.id === selectedOpportunityId
  );
  
  const handleEditOpportunity = (opportunity: BidOpportunity) => {
    setEditingOpportunity(opportunity);
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
            <Calendar className="h-4 w-4 text-purple-500" />
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

      {/* Bidding Opportunities Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold">Bidding Opportunities</h2>
            <p className="text-muted-foreground">Manage bidding opportunities for {currentClass.className}</p>
          </div>
          <Button 
            onClick={() => setShowOpportunityManager(true)}
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
                      <TableRow 
                        key={opportunity.id}
                        className={selectedOpportunityId === opportunity.id ? "bg-academy-lightBlue/10" : ""}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Selected Opportunity Details */}
            {selectedOpportunity && (
              <Card className="border-l-4 border-l-academy-blue bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-academy-blue" />
                    Opportunity Details: {selectedOpportunity.title}
                  </CardTitle>
                  <CardDescription>
                    Detailed information for the selected bidding opportunity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <div className="mt-2 p-3 bg-white rounded-md border">
                        <p className="text-gray-800">{selectedOpportunity.description}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Event Details</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">Event Date:</span>
                          <span className="font-medium">{formatDate(selectedOpportunity.date)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">Bidding Opens:</span>
                          <span className="font-medium">
                            {selectedOpportunity.bidOpenDate ? formatDate(selectedOpportunity.bidOpenDate) : "1 week before"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">Student Capacity:</span>
                          <span className="font-medium text-purple-600">{currentClass.capacity} students</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">Current Bidders:</span>
                          <span className="font-medium text-blue-600">{selectedOpportunity.bidders.length} students</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge variant={getBidOpportunityStatus(selectedOpportunity) === "Open for Bidding" ? "default" : "secondary"}>
                            {getBidOpportunityStatus(selectedOpportunity)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Status Indicator */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-gray-600">Capacity Status</Label>
                      <span className="text-sm text-gray-500">
                        {selectedOpportunity.bidders.length} / {currentClass.capacity} students
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          selectedOpportunity.bidders.length > currentClass.capacity 
                            ? 'bg-red-500' 
                            : selectedOpportunity.bidders.length === currentClass.capacity
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min((selectedOpportunity.bidders.length / currentClass.capacity) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedOpportunity.bidders.length > currentClass.capacity 
                        ? `${selectedOpportunity.bidders.length - currentClass.capacity} students over capacity - random selection will be required`
                        : selectedOpportunity.bidders.length === currentClass.capacity
                        ? "At full capacity - all bidders can be selected"
                        : `${currentClass.capacity - selectedOpportunity.bidders.length} spots remaining`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bidding Opportunities</h3>
              <p className="text-muted-foreground mb-4">
                Create your first bidding opportunity to get started.
              </p>
              <Button onClick={() => setShowOpportunityManager(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Opportunity
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Student Overview Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Student Overview</h2>
          <p className="text-muted-foreground">Current bidding activity and selections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Bidders
              </CardTitle>
              <CardDescription>
                {selectedOpportunity 
                  ? `Students who have placed bids for ${selectedOpportunity.title}`
                  : `Students who have placed bids for any opportunity`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedOpportunity ? (
                selectedOpportunity.bidders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-muted-foreground">No bids placed yet for this opportunity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedOpportunity.bidders.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                        <Badge variant="outline">Bidder</Badge>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                currentClass.bidders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-muted-foreground">No bids placed yet for any opportunity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {currentClass.bidders.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                        <Badge variant="outline">Bidder</Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Selected Students
              </CardTitle>
              <CardDescription>
                {selectedOpportunity 
                  ? `Students who were selected for ${selectedOpportunity.title}`
                  : `Students who were selected for the current reward`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedOpportunity ? (
                selectedOpportunity.selectedStudents?.length === 0 || !selectedOpportunity.selectedStudents ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-muted-foreground">No students have been selected yet for this opportunity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedOpportunity.selectedStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                        <Badge className="bg-green-500">Selected</Badge>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                currentClass.selectedStudents?.length === 0 || !currentClass.selectedStudents ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-muted-foreground">No students have been selected yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {currentClass.selectedStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                        <Badge className="bg-green-500">Selected</Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Opportunity Manager Dialog */}
      {showOpportunityManager && (
        <Dialog open={showOpportunityManager} onOpenChange={setShowOpportunityManager}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Bidding Opportunities</DialogTitle>
              <DialogDescription>
                Create and manage bidding opportunities for {currentClass.className}
              </DialogDescription>
            </DialogHeader>
            <BidOpportunityManager
              currentClass={currentClass}
              onOpportunityCreated={(opportunity) => {
                onOpportunityCreated?.(opportunity);
                setShowOpportunityManager(false);
              }}
              onOpportunityDeleted={onOpportunityDeleted || (() => {})}
              onEditOpportunity={handleEditOpportunity}
            />
          </DialogContent>
        </Dialog>
      )}

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