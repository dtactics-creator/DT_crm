import { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';
import Input from './Input';
import { cn } from '../../lib/utils';

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function FilterBar({ search, onSearchChange, searchPlaceholder = 'Search...', filters, actions, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
        <Input 
          value={search} 
          onChange={(e) => onSearchChange(e.target.value)} 
          placeholder={searchPlaceholder} 
          className="pl-10" 
        />
      </div>
      {(filters || actions) && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {filters && <Filter className="h-4 w-4 text-subtle-fg hidden sm:block shrink-0" />}
          {filters}
          {actions}
        </div>
      )}
    </div>
  );
}
