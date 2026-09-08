/**
 * Reusable Searchable Dropdown Component
 * Provides search, filter, and accessibility features
 * Fully responsive and WCAG 2.1 AA compliant
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, CheckCircle2 } from 'lucide-react';

export const SearchableDropdown = ({
  options = [],
  value = '',
  onChange = () => {},
  onSearch = () => {},
  placeholder = 'Search and select...',
  label = '',
  isMulti = false,
  disabled = false,
  error = '',
  showSearch = true,
  getOptionLabel = (option) => option?.name || option?.title || String(option),
  getOptionValue = (option) => option?.id || String(option),
  searchFields = ['name', 'title', 'city', 'district'],
  className = '',
  id = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search query
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setFilteredOptions(options);
      if (onSearch) onSearch(searchQuery);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = options.filter((option) => {
      return searchFields.some((field) => {
        const fieldValue = String(option?.[field] || '').toLowerCase();
        return fieldValue.includes(lowerQuery);
      });
    });

    setFilteredOptions(filtered);
    setHighlightedIndex(0);
    if (onSearch) onSearch(searchQuery);
  }, [searchQuery, options, searchFields, onSearch, showSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const items = listRef.current.querySelectorAll('[role="option"]');
    const highlighted = items[highlightedIndex];
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Handle option selection
  const handleSelectOption = (option) => {
    onChange(option);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((i) =>
            i < filteredOptions.length - 1 ? i + 1 : i
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
        }
        break;
      case ' ':
        if (!searchQuery && isOpen) {
          e.preventDefault();
        }
        break;
      default:
        break;
    }
  };

  const selectedLabel = value
    ? getOptionLabel(options.find((opt) => getOptionValue(opt) === value) || value)
    : placeholder;

  return (
    <div className={`searchable-dropdown w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2.5
            focus-within:text-blue-600 dark:focus-within:text-blue-400 transition-colors"
        >
          {label}
          {error && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 rounded-lg
            flex items-center justify-between transition-all duration-200
            ${
              disabled
                ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60'
                : isOpen
                  ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20'
            }
            ${error ? 'border-red-500 dark:border-red-500' : ''}
            text-gray-900 dark:text-gray-100
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || 'Select option'}
        >
          <span className="truncate text-base">{selectedLabel}</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400
            rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input */}
            {showSearch && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-md
                      bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      placeholder-gray-500 dark:placeholder-gray-400 transition-all"
                    aria-label={`Search ${label}`}
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <ul
              ref={listRef}
              className="max-h-72 overflow-y-auto py-2"
              role="listbox"
              aria-label="Select an option"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const optionLabel = getOptionLabel(option);
                  const isSelected = optionValue === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li key={optionValue} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => handleSelectOption(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onKeyDown={handleKeyDown}
                        className={`w-full text-left px-4 py-3 transition-all duration-150
                          flex items-center justify-between gap-2
                          ${
                            isHighlighted || isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        <span className="flex-1 truncate font-medium">{optionLabel}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-base font-medium">No options found</p>
                  <p className="text-sm mt-1 opacity-75">Try different search keywords</p>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!error && label && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {showSearch ? 'Type to search' : 'Click to select'}
        </p>
      )}
    </div>
  );
};

export default SearchableDropdown;
