import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react';

interface SearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  defaultValue?: string;
}

export function Search({ 
  placeholder = '搜索...', 
  className, 
  onSearch, 
  defaultValue 
}: SearchProps) {
  const [query, setQuery] = useState(defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className={[
          'pl-10 pr-4 py-2 w-full rounded-full border input-primary',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          className
        ].join(' ')}
      />
      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"></SearchIcon>
      <Button
        type="submit"
        size="icon"
        className="absolute right-1 top-1/2 transform -translate-y-1/2 rounded-full bg-primary hover:bg-primary/90"
        aria-label="搜索"
      >
        <SearchIcon className="h-4 w-4 text-primary-foreground"></SearchIcon>
      </Button>
    </form>
  );
}