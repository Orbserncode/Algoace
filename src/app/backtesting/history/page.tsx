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
import { DownloadIcon, FileTextIcon, BarChart3Icon, TrashIcon, RefreshCwIcon, BrainIcon } from "lucide-react";

interface BacktestHistoryItem {
  id: number;
  strategy_id: string;
  timestamp: string;
  parameters: any;
  summary_metrics: any;
  has_ai_analysis: boolean;
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
}

export default function BacktestHistoryPage() {
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
      const response = await fetch('/api/backtest-history');
      if (!response.ok) {
        throw new Error(`Error fetching backtest history: ${response.statusText}`);
      }
      const data = await response.json();
      setBacktestHistory(data);
    } catch (error) {
      console.error('Failed to fetch backtest history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch backtest history',
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
      setSelectedBacktest(data);
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
    } catch (error) {
      console.error('Failed to delete backtest:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete backtest',
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
        description: 'Failed to generate AI analysis',
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
        description: 'Failed to generate PDF report',
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
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtestHistory.map((backtest) => (
                  <TableRow key={backtest.id}>
                    <TableCell>{backtest.strategy_id}</TableCell>
                    <TableCell>{format(new Date(backtest.timestamp), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>{backtest.parameters?.symbol || 'N/A'}</TableCell>
                    <TableCell>{backtest.parameters?.timeframe || 'N/A'}</TableCell>
                    <TableCell className={backtest.summary_metrics?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${backtest.summary_metrics?.netProfit?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {(backtest.summary_metrics?.winRate * 100).toFixed(1)}%
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
                {selectedBacktest.strategy_id} - {format(new Date(selectedBacktest.timestamp), 'MMM d, yyyy HH:mm')}
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
                      <TableRow>
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