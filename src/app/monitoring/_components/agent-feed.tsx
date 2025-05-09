// src/app/monitoring/_components/agent-feed.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from '@/lib/utils';

// Define the structure of an agent message
interface AgentMessage {
  id: string;
  timestamp: string;
  agentName: string;
  agentType: string;
  message: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedAssets?: string[];
  concernLevel?: 'low' | 'medium' | 'high';
}

// Mock data for agent feed
const mockAgentFeed: AgentMessage[] = [
  {
    id: 'msg-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    agentName: 'Research Agent',
    agentType: 'Research Agent',
    message: 'Analysis of EUR/USD shows bullish momentum with strong support at 1.0750. Recent economic data from the EU suggests continued growth.',
    sentiment: 'positive',
    relatedAssets: ['EUR/USD'],
    concernLevel: 'low',
  },
  {
    id: 'msg-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
    agentName: 'Risk Agent',
    agentType: 'Risk Agent',
    message: 'Portfolio exposure to tech sector exceeds recommended threshold (25%). Consider rebalancing to reduce concentration risk.',
    sentiment: 'negative',
    concernLevel: 'medium',
  },
  {
    id: 'msg-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    agentName: 'Portfolio Agent',
    agentType: 'Portfolio Agent',
    message: 'Monthly rebalancing completed. Adjusted allocations to maintain target risk profile. Performance is within expected parameters.',
    sentiment: 'neutral',
    concernLevel: 'low',
  },
  {
    id: 'msg-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    agentName: 'Execution Agent',
    agentType: 'Execution Agent',
    message: 'Executed BTC/USD long position based on signals from Research and Portfolio agents. Entry at $62,450 with 2% risk allocation.',
    sentiment: 'positive',
    relatedAssets: ['BTC/USD'],
    concernLevel: 'low',
  },
  {
    id: 'msg-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    agentName: 'Research Agent',
    agentType: 'Research Agent',
    message: 'URGENT: Unexpected volatility in AAPL following earnings report. Recommend reducing position size until market stabilizes.',
    sentiment: 'negative',
    relatedAssets: ['AAPL'],
    concernLevel: 'high',
  },
];

// Function to fetch agent feed data
const fetchAgentFeed = async (): Promise<AgentMessage[]> => {
  // In a real implementation, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [...mockAgentFeed];
};

export function AgentFeed() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgentFeed = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const feed = await fetchAgentFeed();
        setMessages(feed);
      } catch (err) {
        console.error('Failed to fetch agent feed:', err);
        setError('Could not load agent feed data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAgentFeed();
    
    // Set up polling for updates every 30 seconds
    const intervalId = setInterval(loadAgentFeed, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format timestamp to a readable format
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Get appropriate color for sentiment
  const getSentimentColor = (sentiment: AgentMessage['sentiment'], concernLevel?: AgentMessage['concernLevel']): string => {
    if (sentiment === 'negative' || concernLevel === 'high') return 'text-red-500';
    if (sentiment === 'positive') return 'text-green-500';
    return 'text-gray-500';
  };

  // Get icon for message based on sentiment and concern level
  const getMessageIcon = (message: AgentMessage) => {
    if (message.sentiment === 'negative' || message.concernLevel === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    }
    if (message.sentiment === 'positive') {
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Feed</CardTitle>
        <CardDescription>
          Real-time insights and decisions from AI agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading agent feed...</span>
          </div>
        ) : error ? (
          <div className="flex items-center text-destructive py-4">
            <AlertTriangle className="mr-2 h-4 w-4" />
            <p>{error}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-3 relative">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{message.agentName}</div>
                    <div className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</div>
                  </div>
                  <div className="flex gap-2">
                    {getMessageIcon(message)}
                    <p className={cn(
                      "text-sm",
                      getSentimentColor(message.sentiment, message.concernLevel)
                    )}>
                      {message.message}
                    </p>
                  </div>
                  {message.relatedAssets && message.relatedAssets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.relatedAssets.map(asset => (
                        <span key={asset} className="text-xs bg-muted px-2 py-1 rounded-full">
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.concernLevel === 'high' && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full mr-2 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}