import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader, CheckCircle } from 'lucide-react';
import { searchAddressSuggestions, type Coordinates } from '../lib/maps';
import { Input } from './Input';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (address: string, coordinates: Coordinates) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  confirmed?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelectAddress,
  placeholder = 'Ingresá una dirección',
  label = 'Dirección',
  required = false,
  confirmed = false
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Array<{
    displayName: string;
    coordinates: Coordinates;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchAddressSuggestions(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: { displayName: string; coordinates: Coordinates }) => {
    onChange(suggestion.displayName);
    onSelectAddress(suggestion.displayName, suggestion.coordinates);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <MapPin className="w-4 h-4 text-gray-600" />
        {label}
      </label>

      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          fullWidth
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <Loader className="w-4 h-4 text-gray-400 animate-spin" />}
          {confirmed && !loading && <CheckCircle className="w-4 h-4 text-green-600" />}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{suggestion.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
