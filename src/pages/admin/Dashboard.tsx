import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClassConfig, BidOpportunity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getBidOpportunityStatus } from "@/utils/dates";
import EditBidOpportunityDialog from "@/components/admin/EditBidOpportunityDialog";
import BidOpportunityManager from "@/components/admin/BidOpportunityManager";
import { Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Class Management</h1>
          <p className="text-muted-foreground">Managing: {currentClass.className}</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
            className="flex items-center gap-2"
          >
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
      
      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList>
          <TabsTrigger value="opportunities">Bidding Opportunities</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="opportunities">
          <BidOpportunityManager
            currentClass={currentClass}
            onOpportunityCreated={onOpportunityCreated || (() => {})}
            onOpportunityDeleted={onOpportunityDeleted || (() => {})}
            onEditOpportunity={handleEditOpportunity}
          />
        </TabsContent>
        
        <TabsContent value="overview">
          {currentClass.bidOpportunities && currentClass.bidOpportunities.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-heading mb-4">Bidding Opportunities Overview</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
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
                          >
                            {selectedOpportunityId === opportunity.id ? "Hide Details" : "View Details"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOpportunity(opportunity);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Bidders</CardTitle>
                <CardDescription>
                  {selectedOpportunity 
                    ? `Students who have placed bids for ${selectedOpportunity.title}`
                    : `Students who have placed bids for any opportunity`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedOpportunity ? (
                  selectedOpportunity.bidders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No bids placed yet for this opportunity
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedOpportunity.bidders.map((student) => (
                        <div key={student.id} className="p-2 bg-gray-50 rounded-md">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  currentClass.bidders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No bids placed yet for any opportunity
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentClass.bidders.map((student) => (
                        <div key={student.id} className="p-2 bg-gray-50 rounded-md">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Selected Students</CardTitle>
                <CardDescription>
                  {selectedOpportunity 
                    ? `Students who were selected for ${selectedOpportunity.title}`
                    : `Students who were selected for the current reward`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedOpportunity ? (
                  selectedOpportunity.selectedStudents?.length === 0 || !selectedOpportunity.selectedStudents ? (
                    <p className="text-center text-muted-foreground py-4">
                      No students have been selected yet for this opportunity
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedOpportunity.selectedStudents.map((student) => (
                        <div key={student.id} className="p-2 bg-academy-lightBlue/10 rounded-md">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  currentClass.selectedStudents?.length === 0 || !currentClass.selectedStudents ? (
                    <p className="text-center text-muted-foreground py-4">
                      No students have been selected yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentClass.selectedStudents.map((student) => (
                        <div key={student.id} className="p-2 bg-academy-lightBlue/10 rounded-md">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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