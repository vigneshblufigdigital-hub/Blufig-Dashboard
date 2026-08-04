import React, { useState, useRef, useEffect } from 'react';
import { UserProfile as User } from '../../types';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableUserSelectProps {
  users: User[];
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableUserSelect: React.FC<SearchableUserSelectProps> = ({
  users,
  value,
  onValueChange,
  placeholder = 'Search & select user...',
  searchPlaceholder = 'Type name, email, designation...',
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users.find((u) => u.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    const desigMatch = u.designation?.toLowerCase().includes(term);
    const roleMatch = u.role?.toLowerCase().replace('_', ' ').includes(term);
    const deptMatch = u.department?.toLowerCase().includes(term);
    return nameMatch || emailMatch || desigMatch || roleMatch || deptMatch;
  });

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatRoleOrDesignation = (u: User) => {
    if (u.designation) return u.designation;
    return u.role.replace('_', ' ');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-left cursor-pointer text-sm shadow-2xs',
          isOpen
            ? 'border-brand-secondary ring-2 ring-brand-secondary/20 bg-white dark:bg-zinc-900'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700',
          disabled && 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800'
        )}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-full bg-brand-secondary/15 text-brand-secondary font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-brand-secondary/20">
              {getInitials(selectedUser.name)}
            </div>
            <div className="min-w-0 flex-1 truncate flex items-center gap-1.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate">
                {selectedUser.name}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate shrink-0">
                ({formatRoleOrDesignation(selectedUser)})
              </span>
            </div>
          </div>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 text-xs sm:text-sm font-medium truncate">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {selectedUser && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onValueChange('');
              }}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-zinc-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-brand-secondary'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[300px] animate-in fade-in-50 zoom-in-95">
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto flex-1 p-1 space-y-0.5 max-h-[220px]">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelected = u.id === value;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onValueChange(u.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group text-xs',
                      isSelected
                        ? 'bg-brand-secondary/10 text-brand-secondary font-bold'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 border',
                          isSelected
                            ? 'bg-brand-secondary text-white border-brand-secondary'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                        )}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold truncate text-zinc-900 dark:text-zinc-100">
                            {u.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                            {formatRoleOrDesignation(u)}
                          </span>
                        </div>
                        {u.email && (
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                            {u.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="shrink-0 ml-2">
                        <Check className="w-4 h-4 text-brand-secondary" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No users found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
