'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  FileType, 
  Database, 
  Calendar, 
  HardDrive, 
  Tag, 
  Filter, 
  ArrowUpDown, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDatasetById, getDatasetData, Dataset } from '@/services/datasets-service';
import { format } from 'date-fns';

// Simulated data for the table
interface DataRow {
  id: string;
  [key: string]: any;
}

export default function DatasetExplorerPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Table state
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load dataset details
  useEffect(() => {
    const fetchDataset = async () => {
      if (!params.id) return;
      
      try {
        const datasetId = Array.isArray(params.id) ? params.id[0] : params.id;
        const fetchedDataset = await getDatasetById(datasetId);
        
        if (fetchedDataset) {
          setDataset(fetchedDataset);
          
          // Set up columns based on dataset metadata
          if (fetchedDataset.metadata && fetchedDataset.metadata.columns) {
            setColumns(fetchedDataset.metadata.columns);
            setVisibleColumns(fetchedDataset.metadata.columns);
          }
          
          // Simulate loading data
          loadDatasetData(fetchedDataset);
        } else {
          setError('Dataset not found');
        }
      } catch (err) {
        console.error('Failed to load dataset:', err);
        setError('Failed to load dataset. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDataset();
  }, [params.id]);
  
  // Reload data when pagination, sorting, or filtering changes
  useEffect(() => {
    if (dataset) {
      loadDatasetData(dataset);
    }
  }, [currentPage, pageSize, sortColumn, sortDirection, filters]);

  // Load dataset data from the backend
  const loadDatasetData = async (dataset: Dataset) => {
    setIsLoadingData(true);
    
    try {
      if (!dataset.id) {
        throw new Error('Dataset ID is required');
      }
      
      // Check if dataset size is reasonable before attempting to load
      if (dataset.size <= 0) {
        throw new Error('Dataset appears to be empty');
      }
      
      // Fetch data from the backend with pagination, sorting, and filtering
      const result = await getDatasetData(
        dataset.id,
        currentPage,
        pageSize,
        sortColumn || undefined,
        sortDirection,
        filters
      );
      
      // Ensure we have columns defined
      if (!columns.length && result.data.length > 0) {
        const sampleColumns = Object.keys(result.data[0]);
        setColumns(sampleColumns);
        setVisibleColumns(sampleColumns);
      }
      
      setData(result.data.map((item, index) => ({
        id: `row-${index}`,
        ...item
      })));
      setTotalRows(result.totalRows);
    } catch (error) {
      console.error('Failed to load dataset data:', error);
      setError(`Failed to load dataset data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setData([]);
      setTotalRows(0);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Format file size
  const formatFileSize = (sizeInKB: number): string => {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(2)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(2)} GB`;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      forex: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      crypto: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      stocks: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      futures: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      commodities: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      indices: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    
    return colors[category] || colors.other;
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileType className="h-4 w-4" />;
      case 'json':
        return <FileType className="h-4 w-4" />;
      case 'parquet':
        return <Database className="h-4 w-4" />;
      default:
        return <FileType className="h-4 w-4" />;
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
    
    // In a real implementation, this would trigger a data reload
    // with the new sort parameters
  };

  // Handle column visibility toggle
  const handleColumnToggle = (column: string) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter(col => col !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // In a real implementation, this would trigger a data reload
    // with the new pagination parameters
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
    // In a real implementation, this would trigger a data reload
    // with the new search parameters
  };

  // Handle filter change
  const handleFilterChange = (column: string, value: any) => {
    setFilters({
      ...filters,
      [column]: value
    });
    setCurrentPage(1); // Reset to first page on new filter
    // In a real implementation, this would trigger a data reload
    // with the new filter parameters
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalRows / pageSize);

  // Format cell value based on column type
  const formatCellValue = (column: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    
    if (column === 'timestamp' || column.includes('date')) {
      try {
        return format(new Date(value), 'yyyy-MM-dd HH:mm:ss');
      } catch (e) {
        return String(value);
      }
    }
    
    if (typeof value === 'number') {
      if (column === 'volume' || column === 'open_interest') {
        return value.toLocaleString();
      }
      if (column === 'open' || column === 'high' || column === 'low' || column === 'close' || column.includes('price')) {
        return value.toFixed(2);
      }
    }
    
    return String(value);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[calc(100vh-200px)] w-full" />
      </div>
    );
  }

  // Render error state
  if (error || !dataset) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Datasets
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Database className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">{error || 'Dataset not found'}</p>
            <Button onClick={() => router.back()}>Return to Datasets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Datasets
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {dataset.name}
              <Badge className={`${getCategoryColor(dataset.category)} capitalize ml-2`}>
                {dataset.category}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {dataset.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => loadDatasetData(dataset)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                // Create a download link for the dataset
                const downloadUrl = `${window.location.origin}/api/datasets/${dataset.id}/download`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${dataset.name}.${dataset.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                toast({
                  title: "Download started",
                  description: `Downloading ${dataset.name}.${dataset.format}`,
                });
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Format</p>
                <p className="text-sm text-muted-foreground">{dataset.format.toUpperCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Size</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(dataset.size)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="text-sm text-muted-foreground">{dataset.source}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">{formatDate(dataset.lastUpdated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Explorer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Data Explorer</CardTitle>
          <CardDescription>
            Explore and analyze the dataset with advanced filtering and sorting capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </div>
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search data..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <SlidersHorizontal className="h-4 w-4" />
                    Columns
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Visible Columns</SheetTitle>
                    <SheetDescription>
                      Select which columns to display in the table.
                    </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-4">
                      {columns.map((column) => (
                        <div key={column} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`column-${column}`} 
                            checked={visibleColumns.includes(column)}
                            onCheckedChange={() => handleColumnToggle(column)}
                          />
                          <Label htmlFor={`column-${column}`}>{column}</Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Data Filters</SheetTitle>
                    <SheetDescription>
                      Apply filters to narrow down the dataset.
                    </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    {/* Filter controls would go here */}
                    <p className="text-sm text-muted-foreground">
                      Filter controls would be implemented based on column types.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Data Table */}
          <div className="border rounded-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.length > 0 ? (
                      visibleColumns.map((column) => (
                        <TableHead key={column}>
                          <Button
                            variant="ghost"
                            className="p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort(column)}
                          >
                            {column}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      ))
                    ) : (
                      <TableHead>No columns available</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingData ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        {visibleColumns.length > 0 ? (
                          visibleColumns.map((column) => (
                            <TableCell key={`loading-${index}-${column}`}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))
                        ) : (
                          <TableCell>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(visibleColumns.length, 1)} className="h-24 text-center text-muted-foreground">
                        {dataset.size <= 0 ?
                          "This dataset appears to be empty. Try uploading a new file." :
                          "No data found for this dataset with the current filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id}>
                        {visibleColumns.map((column) => (
                          <TableCell key={`${row.id}-${column}`}>
                            {formatCellValue(column, row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRows)} of {totalRows} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {pageSize} rows
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {[10, 25, 50, 100, 250, 500].map((size) => (
                      <DropdownMenuItem 
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                      >
                        {size} rows
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}