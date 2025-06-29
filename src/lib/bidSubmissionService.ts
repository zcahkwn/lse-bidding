import { supabase } from '@/lib/supabase';

// Check if a bid is recent (within the last 15 minutes)
export const isRecentBid = (timestamp: string): boolean => {
  const bidTime = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const fifteenMinutesInMs = 15 * 60 * 1000;
  
  return now - bidTime < fifteenMinutesInMs;
};

// Get class statistics for real-time monitoring
export const getClassStatistics = async (classId: string) => {
  try {
    // Get recent bids with student and opportunity details
    const { data: recentBids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id,
        bid_amount,
        is_winner,
        created_at,
        student:students(id, name, email),
        opportunity:opportunities(id, description)
      `)
      .eq('opportunity_id', classId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (bidsError) throw bidsError;
    
    // Get total bid count
    const { count: totalBids, error: countError } = await supabase
      .from('bids')
      .select('id', { count: 'exact' })
      .eq('opportunity_id', classId);
    
    if (countError) throw countError;
    
    // Get last bid timestamp
    const { data: lastBid, error: lastBidError } = await supabase
      .from('bids')
      .select('created_at')
      .eq('opportunity_id', classId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lastBidError && lastBidError.code !== 'PGRST116') throw lastBidError;
    
    return {
      totalBids: totalBids || 0,
      lastBidTimestamp: lastBid?.created_at,
      recentBids: recentBids || []
    };
  } catch (error) {
    console.error('Error fetching class statistics:', error);
    return {
      totalBids: 0,
      lastBidTimestamp: undefined,
      recentBids: []
    };
  }
};