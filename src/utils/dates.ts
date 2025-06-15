import { BidOpportunity } from "@/types";

// Function to check if a bid opportunity is currently open
export const isBidOpportunityOpen = (opportunity: BidOpportunity): boolean => {
  const now = new Date();
  const eventDate = new Date(opportunity.date);
  
  // Use bidOpenDate if available, otherwise calculate 1 week before event
  const biddingOpensDate = opportunity.bidOpenDate 
    ? new Date(opportunity.bidOpenDate)
    : new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Bidding is open if current date is after bidding opening date and before event date
  return now >= biddingOpensDate && now < eventDate;
};

// Format a date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
};

// Get readable status for a bid opportunity
export const getBidOpportunityStatus = (opportunity: BidOpportunity): string => {
  const now = new Date();
  const eventDate = new Date(opportunity.date);
  
  // Use bidOpenDate if available, otherwise calculate 1 week before event
  const biddingOpensDate = opportunity.bidOpenDate 
    ? new Date(opportunity.bidOpenDate)
    : new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  if (now > eventDate) {
    return "Completed";
  } else if (now >= biddingOpensDate && now < eventDate) {
    return "Open for Bidding";
  } else {
    return "Coming Soon";
  }
};