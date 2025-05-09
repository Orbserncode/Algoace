'use client';

import { Button } from "@/components/ui/button";
import { DatasetCategory } from '@/services/datasets-service';
import { 
  Database, 
  DollarSign, 
  Coins, 
  BarChart, 
  LineChart, 
  Package, 
  Globe 
} from "lucide-react";

interface DatasetCategoryFilterProps {
  selectedCategory: DatasetCategory | 'all';
  onCategoryChange: (category: DatasetCategory | 'all') => void;
}

interface CategoryOption {
  value: DatasetCategory | 'all';
  label: string;
  icon: React.ReactNode;
}

export function DatasetCategoryFilter({ 
  selectedCategory, 
  onCategoryChange 
}: DatasetCategoryFilterProps) {
  
  const categories: CategoryOption[] = [
    { value: 'all', label: 'All', icon: <Database className="h-4 w-4" /> },
    { value: 'forex', label: 'Forex', icon: <DollarSign className="h-4 w-4" /> },
    { value: 'crypto', label: 'Crypto', icon: <Coins className="h-4 w-4" /> },
    { value: 'stocks', label: 'Stocks', icon: <BarChart className="h-4 w-4" /> },
    { value: 'futures', label: 'Futures', icon: <LineChart className="h-4 w-4" /> },
    { value: 'commodities', label: 'Commodities', icon: <Package className="h-4 w-4" /> },
    { value: 'indices', label: 'Indices', icon: <Globe className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category.value}
          variant={selectedCategory === category.value ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-1"
          onClick={() => onCategoryChange(category.value)}
        >
          {category.icon}
          <span className="hidden sm:inline">{category.label}</span>
        </Button>
      ))}
    </div>
  );
}