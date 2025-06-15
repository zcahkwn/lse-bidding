import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Activity, Users, Clock, TrendingUp } from "lucide-react";
import { useRealtimeBidSubmission } from "@/hooks/useRealtimeBidSubmission";
import { isRecentBid } from "@/lib/bidSubmissionService";
import { ClassConfig } from "@/types";

interface RealtimeBidMonitorProps {
  currentClass: ClassConfig;
  refreshInterval?: number;
}

const RealtimeBidMonitor = ({ currentClass, refreshInterval = 5000 }: RealtimeBidMonitorProps) => {
  const [bidStats, setBidStats] = useState({
    totalBids: 0,
    lastBidTimestamp: undefined as string | undefined,
    recentBids: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const { getClassStatistics } = useRealtimeBidSubmission();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getClassStatistics(currentClass.id);
        setBidStats(stats);
      } catch (error) {
        console.error('Error fetching bid statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [currentClass.id, getClassStatistics, refreshInterval]);

  const recentBidsCount = bidStats.recentBids.filter(bid => 
    isRecentBid(bid.created_at)
  ).length;

  const availableTokens = currentClass.students.filter(s => !s.hasUsedToken).length;
  const usedTokens = currentClass.students.length - availableTokens;

  return (
    <div className="space-y-6">
      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bidStats.totalBids}</div>
            <p className="text-xs text-muted-foreground">
              {recentBidsCount} in last 15 min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bidders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentClass.bidders.length}</div>
            <p className="text-xs text-muted-foreground">
              of {currentClass.students.length} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Available</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableTokens}</div>
            <p className="text-xs text-muted-foreground">
              {usedTokens} used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {bidStats.lastBidTimestamp ? (
                new Date(bidStats.lastBidTimestamp).toLocaleTimeString()
              ) : (
                'No activity'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {bidStats.lastBidTimestamp && isRecentBid(bidStats.lastBidTimestamp) ? (
                <Badge variant="default" className="text-xs">Recent</Badge>
              ) : (
                'No recent activity'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Alert */}
      {recentBidsCount > 0 && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <strong>{recentBidsCount} new bid{recentBidsCount > 1 ? 's' : ''}</strong> submitted in the last 15 minutes
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Bids Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Bid Activity
          </CardTitle>
          <CardDescription>
            Live updates of bid submissions across all opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading bid activity...</span>
            </div>
          ) : bidStats.recentBids.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No bid activity yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bidStats.recentBids.map((bid) => (
                  <TableRow 
                    key={bid.id}
                    className={isRecentBid(bid.created_at) ? "bg-blue-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {bid.student?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {bid.opportunity?.description || 'Unknown Opportunity'}
                    </TableCell>
                    <TableCell>{bid.bid_amount || 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {new Date(bid.created_at).toLocaleTimeString()}
                        {isRecentBid(bid.created_at) && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bid.is_winner ? "default" : "outline"}>
                        {bid.is_winner ? "Winner" : "Submitted"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Token Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Token Status Overview</CardTitle>
          <CardDescription>
            Real-time view of student token availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 text-green-600">Available Tokens ({availableTokens})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {currentClass.students
                  .filter(s => !s.hasUsedToken)
                  .map(student => (
                    <div key={student.id} className="text-sm p-2 bg-green-50 rounded">
                      {student.name}
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-gray-600">Token Unavailable ({usedTokens})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {currentClass.students
                  .filter(s => s.hasUsedToken)
                  .map(student => (
                    <div key={student.id} className="text-sm p-2 bg-gray-50 rounded">
                      {student.name}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeBidMonitor;