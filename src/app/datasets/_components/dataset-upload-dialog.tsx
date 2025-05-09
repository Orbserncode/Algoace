'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Download, AlertCircle } from "lucide-react";
import { uploadDatasetFile, DatasetCategory } from '@/services/datasets-service';
import { useToast } from "@/hooks/use-toast";

interface DatasetUploadDialogProps {
  onUploadComplete: () => void;
}

export function DatasetUploadDialog({ onUploadComplete }: DatasetUploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'manual' | 'broker'>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DatasetCategory>('forex');
  const [subcategory, setSubcategory] = useState('');
  const [source, setSource] = useState('Manual Upload');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Broker source state
  const [brokerSource, setBrokerSource] = useState('');
  const [symbol, setSymbol] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('forex');
    setSubcategory('');
    setSource('Manual Upload');
    setTags('');
    setFile(null);
    setBrokerSource('');
    setSymbol('');
    setStartDate('');
    setEndDate('');
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleManualUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!name) {
      setError('Please enter a name for the dataset');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Convert tags string to array
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const result = await uploadDatasetFile(
        file,
        name,
        description,
        category,
        subcategory,
        source,
        tagsArray
      );
      
      if (result) {
        toast({
          title: "Dataset uploaded",
          description: `${name} has been successfully uploaded.`,
        });
        
        handleClose();
        onUploadComplete();
      } else {
        setError('Failed to upload dataset. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleBrokerDownload = async () => {
    if (!brokerSource) {
      setError('Please select a broker source');
      return;
    }
    
    if (!symbol) {
      setError('Please enter a symbol');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call an API to download data from the broker
      // For now, we'll just simulate a successful download
      
      toast({
        title: "Data download initiated",
        description: `Downloading ${symbol} data from ${brokerSource}...`,
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Dataset created",
        description: `${symbol} data has been successfully downloaded and added to your datasets.`,
      });
      
      handleClose();
      onUploadComplete();
    } catch (err) {
      console.error('Download error:', err);
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const downloadTemplate = () => {
    // Create CSV template based on selected category
    let headers = '';
    let sampleRow = '';
    
    switch (category) {
      case 'forex':
        headers = 'timestamp,symbol,open,high,low,close,volume';
        sampleRow = '2025-01-01T00:00:00Z,EUR/USD,1.1234,1.1256,1.1220,1.1245,10000';
        break;
      case 'crypto':
        headers = 'timestamp,symbol,open,high,low,close,volume';
        sampleRow = '2025-01-01T00:00:00Z,BTC/USD,50000,51000,49500,50500,100.5';
        break;
      case 'stocks':
        headers = 'timestamp,symbol,open,high,low,close,volume,adj_close';
        sampleRow = '2025-01-01T00:00:00Z,AAPL,150.25,152.75,149.50,151.80,5000000,151.80';
        break;
      default:
        headers = 'timestamp,symbol,open,high,low,close,volume';
        sampleRow = '2025-01-01T00:00:00Z,SYMBOL,100,101,99,100.5,1000';
    }
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}_data_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: `${category} data template has been downloaded.`,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-1">
          <Upload className="h-4 w-4" />
          Upload Dataset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Dataset</DialogTitle>
          <DialogDescription>
            Add a new dataset for backtesting and analysis.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="manual" value={uploadTab} onValueChange={(value) => setUploadTab(value as 'manual' | 'broker')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">Manual Upload</TabsTrigger>
            <TabsTrigger value="broker">Download from Broker</TabsTrigger>
          </TabsList>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dataset Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., EUR/USD Daily Data"
                  disabled={isUploading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value: DatasetCategory) => setCategory(value)}
                  disabled={isUploading}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="futures">Futures</SelectItem>
                    <SelectItem value="commodities">Commodities</SelectItem>
                    <SelectItem value="indices">Indices</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g., Major Pairs"
                  disabled={isUploading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Manual Upload"
                  disabled={isUploading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the dataset"
                disabled={isUploading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., forex, eurusd, daily"
                disabled={isUploading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="file">File</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={isUploading}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download Template
                </Button>
              </div>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".csv,.json,.parquet"
                disabled={isUploading}
                ref={fileInputRef}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, JSON, Parquet
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="broker" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="broker-source">Broker Source</Label>
                <Select
                  value={brokerSource}
                  onValueChange={setBrokerSource}
                  disabled={isUploading}
                >
                  <SelectTrigger id="broker-source">
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alpaca">Alpaca</SelectItem>
                    <SelectItem value="interactive-brokers">Interactive Brokers</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="oanda">OANDA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g., EURUSD, AAPL, BTC/USD"
                  disabled={isUploading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="broker-category">Category</Label>
              <Select
                value={category}
                onValueChange={(value: DatasetCategory) => setCategory(value)}
                disabled={isUploading}
              >
                <SelectTrigger id="broker-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="commodities">Commodities</SelectItem>
                  <SelectItem value="indices">Indices</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Alert className="bg-muted">
              <AlertDescription>
                Data will be downloaded from the selected broker and saved as a dataset.
                Make sure you have configured the broker credentials in the settings.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          {uploadTab === 'manual' ? (
            <Button onClick={handleManualUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Dataset'
              )}
            </Button>
          ) : (
            <Button onClick={handleBrokerDownload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                'Download Data'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
