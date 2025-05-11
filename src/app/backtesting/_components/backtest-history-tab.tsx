'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DownloadIcon, FileTextIcon, BarChart3Icon, TrashIcon, RefreshCwIcon, BrainIcon, LockIcon, UnlockIcon } from "lucide-react";
import { fetchBacktestHistoryList, BacktestHistoryItem as ServiceBacktestHistoryItem } from "@/services/backtesting-service"; // Import the new function and interface

interface BacktestHistoryItem extends ServiceBacktestHistoryItem {
  // Extend the service interface if needed, or just use it directly
  locked: boolean; // Added locked status
}

interface BacktestDetail {
  id: number;
  strategy_id: string;
  timestamp: string;
  parameters: any;
  summary_metrics: any;
  has_ai_analysis: boolean;
  locked: boolean; // Added locked status
}

interface BacktestDetail {
  id: number;
  strategy_id: string;
  timestamp: string;
  parameters: any;
  summary_metrics: any;
  equity_curve: any[];
  trades: any[];
  log_output: string;
  ai_analysis?: string;
  locked: boolean; // Added locked status
}

export default function BacktestHistoryTab() {
  const [backtestHistory, setBacktestHistory] = useState<BacktestHistoryItem[]>([]);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Fetch backtest history
  const fetchBacktestHistory = async () => {
    setIsLoading(true);
    try {
      // Use the new service function to fetch history
      const data = await fetchBacktestHistoryList();
      // Add the locked property to each item
      const dataWithLocked = data.map(item => ({
        ...item,
        locked: false // Default to unlocked
      }));
      // Set the state with the modified data
      setBacktestHistory(dataWithLocked);
    } catch (error) {
      console.error('Failed to fetch backtest history:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch backtest history: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch backtest details
  const fetchBacktestDetail = async (id: number) => {
    try {
      const response = await fetch(`/api/backtest-history/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching backtest detail: ${response.statusText}`);
      }
      const data = await response.json();
      // Add the locked property to the backtest detail
      setSelectedBacktest({
        ...data,
        locked: false // Default to unlocked
      });
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch backtest detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch backtest detail',
        variant: 'destructive',
      });
    }
  };

  // Delete backtest
  const deleteBacktest = async (id: number) => {
    if (!confirm("Are you sure you want to delete this backtest result?")) {
      return;
    }
    try {
      const response = await fetch(`/api/backtest-history/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting backtest: ${response.statusText}`);
      }
      toast({
        title: 'Success',
        description: 'Backtest deleted successfully',
      });
      fetchBacktestHistory();
      setIsDetailOpen(false); // Close detail view if the deleted item was open
    } catch (error) {
      console.error('Failed to delete backtest:', error);
      toast({
        title: 'Error',
        description: `Failed to delete backtest: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };

  // Toggle lock status
  const toggleLockStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/backtest-history/${id}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locked: !currentStatus }),
      });
      if (!response.ok) {
        throw new Error(`Error updating lock status: ${response.statusText}`);
      }
      toast({
        title: 'Success',
        description: `Backtest ${!currentStatus ? 'locked' : 'unlocked'} successfully`,
      });
      fetchBacktestHistory(); // Refresh the list
      if (selectedBacktest && selectedBacktest.id === id) {
         setSelectedBacktest(prev => prev ? { ...prev, locked: !currentStatus } : null); // Update detail view if open
      }
    } catch (error) {
      console.error('Failed to update lock status:', error);
      toast({
        title: 'Error',
        description: `Failed to update lock status: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };


  // Generate AI analysis
  const generateAnalysis = async (id: number) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/backtest-history/${id}/analyze`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Error generating analysis: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Update the selected backtest with the new analysis
      if (selectedBacktest) {
        setSelectedBacktest({
          ...selectedBacktest,
          ai_analysis: data.analysis,
        });
      }
      
      toast({
        title: 'Success',
        description: 'AI analysis generated successfully',
      });
    } catch (error) {
      console.error('Failed to generate analysis:', error);
      toast({
        title: 'Error',
        description: `Failed to generate AI analysis: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate PDF report
  const generatePdfReport = async (id: number) => {
    try {
      const response = await fetch(`/api/backtest-history/${id}/pdf`);
      if (!response.ok) {
        throw new Error(`Error generating PDF report: ${response.statusText}`);
      }
      toast({
        title: 'Info',
        description: 'PDF report generation is not implemented yet',
      });
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      toast({
        title: 'Error',
        description: `Failed to generate PDF report: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };

  // Load backtest history on component mount
  useEffect(() => {
    fetchBacktestHistory();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Backtest History</h1>
        <Button onClick={fetchBacktestHistory} variant="outline" size="sm">
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Backtests</CardTitle>
          <CardDescription>View and manage your backtest results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading backtest history...</p>
            </div>
          ) : backtestHistory.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No backtest history found. Run some backtests first.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b transition-colors hover:bg-muted/50">
                  <TableHead>Strategy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Locked</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtestHistory.map((backtest) => (
                  <TableRow key={backtest.id}>
                    <TableCell>{backtest.strategy_id}</TableCell>
                    <TableCell>{format(new Date(backtest.timestamp), 'dd-MM-yyyy HH:mm')}</TableCell>
                    <TableCell>{backtest.parameters?.symbol || 'N/A'}</TableCell>
                    <TableCell>{backtest.parameters?.timeframe || 'N/A'}</TableCell>
                    <TableCell className={backtest.summary_metrics?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${backtest.summary_metrics?.netProfit?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {(backtest.summary_metrics?.winRate * 100).toFixed(1)}%
                    </TableCell>
                     <TableCell> {/* Locked status cell */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLockStatus(backtest.id, backtest.locked)}
                            title={backtest.locked ? "Unlock Backtest" : "Lock Backtest"}
                        >
                            {backtest.locked ? <LockIcon className="h-4 w-4 text-green-600" /> : <UnlockIcon className="h-4 w-4 text-red-600" />}
                        </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchBacktestDetail(backtest.id)}
                          title="View Details"
                        >
                          <BarChart3Icon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePdfReport(backtest.id)}
                          title="Generate PDF Report"
                        >
                          <FileTextIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBacktest(backtest.id)}
                          title="Delete Backtest"
                          disabled={backtest.locked} // Disable delete if locked
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {/* Backtest Detail Dialog */}
      {selectedBacktest && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Backtest Details</DialogTitle>
              <DialogDescription>
                {selectedBacktest.strategy_id} - {format(new Date(selectedBacktest.timestamp), 'dd-MM-yyyy HH:mm')}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2">
                        <dt className="font-medium">Net Profit:</dt>
                        <dd className={selectedBacktest.summary_metrics?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${selectedBacktest.summary_metrics?.netProfit?.toFixed(2) || '0.00'}
                        </dd>
                        
                        <dt className="font-medium">Win Rate:</dt>
                        <dd>{(selectedBacktest.summary_metrics?.winRate * 100).toFixed(1)}%</dd>
                        
                        <dt className="font-medium">Profit Factor:</dt>
                        <dd>{selectedBacktest.summary_metrics?.profitFactor?.toFixed(2) || 'N/A'}</dd>
                        
                        <dt className="font-medium">Max Drawdown:</dt>
                        <dd>{(selectedBacktest.summary_metrics?.maxDrawdown * 100).toFixed(2)}%</dd>
                        
                        <dt className="font-medium">Total Trades:</dt>
                        <dd>{selectedBacktest.summary_metrics?.totalTrades}</dd>
                        
                        <dt className="font-medium">Avg Trade P&L:</dt>
                        <dd>${selectedBacktest.summary_metrics?.avgTradePnl?.toFixed(2) || '0.00'}</dd>
                        
                        <dt className="font-medium">Sharpe Ratio:</dt>
                        <dd>{selectedBacktest.summary_metrics?.sharpeRatio?.toFixed(2) || 'N/A'}</dd>
                        
                        <dt className="font-medium">Sortino Ratio:</dt>
                        <dd>{selectedBacktest.summary_metrics?.sortinoRatio?.toFixed(2) || 'N/A'}</dd>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Parameters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2">
                        <dt className="font-medium">Symbol:</dt>
                        <dd>{selectedBacktest.parameters?.symbol || 'N/A'}</dd>
                        
                        <dt className="font-medium">Timeframe:</dt>
                        <dd>{selectedBacktest.parameters?.timeframe || 'N/A'}</dd>
                        
                        <dt className="font-medium">Start Date:</dt>
                        <dd>{selectedBacktest.parameters?.startDate || 'N/A'}</dd>
                        
                        <dt className="font-medium">End Date:</dt>
                        <dd>{selectedBacktest.parameters?.endDate || 'N/A'}</dd>
                        
                        <dt className="font-medium">Initial Capital:</dt>
                        <dd>${selectedBacktest.parameters?.initialCapital?.toFixed(2) || '0.00'}</dd>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="trades">
                <ScrollArea className="h-[400px] mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b transition-colors hover:bg-muted/50">
                        <TableHead>Entry Time</TableHead>
                        <TableHead>Exit Time</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBacktest.trades.map((trade, index) => (
                        <TableRow key={index}>
                          <TableCell>{trade.entryTimestamp}</TableCell>
                          <TableCell>{trade.exitTimestamp}</TableCell>
                          <TableCell>{trade.symbol}</TableCell>
                          <TableCell>{trade.direction}</TableCell>
                          <TableCell>${trade.entryPrice.toFixed(2)}</TableCell>
                          <TableCell>${trade.exitPrice.toFixed(2)}</TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${trade.pnl.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="logs">
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <pre className="bg-muted p-4 rounded-md overflow-auto h-[400px] text-sm">
                      {selectedBacktest.log_output}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis">
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    {selectedBacktest.ai_analysis ? (
                      <div className="prose max-w-none">
                        {selectedBacktest.ai_analysis}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                        <p>No AI analysis available for this backtest.</p>
                        <Button 
                          onClick={() => generateAnalysis(selectedBacktest.id)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>Generating Analysis...</>
                          ) : (
                            <>
                              <BrainIcon className="mr-2 h-4 w-4" />
                              Generate AI Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
              <Button onClick={() => generatePdfReport(selectedBacktest.id)}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download PDF Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}