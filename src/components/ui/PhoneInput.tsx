import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Phone, Check } from 'lucide-react';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { COUNTRIES, type Country, detectCountryFromPhone } from '../../lib/countries';

interface PhoneInputProps {
  value: string;
  onChange: (e164: string, isValid: boolean) => void;
  defaultCountryIso2?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, defaultCountryIso2 = 'AE', placeholder = 'Enter your phone number' }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>(
    COUNTRIES.find((c) => c.iso2 === defaultCountryIso2) ?? COUNTRIES[0],
  );
  const [localNumber, setLocalNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // On mount or value change from parent, parse the E.164 number
  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }
    const detected = detectCountryFromPhone(value);
    if (detected) {
      setCountry(detected);
      const remainder = value.slice(detected.dialCode.length).replace(/\s/g, '');
      setLocalNumber(remainder);
    } else {
      setLocalNumber(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validation = useMemo(() => {
    if (!localNumber.trim()) return { valid: false, e164: '' };
    const fullNumber = `${country.dialCode}${localNumber.replace(/\s/g, '')}`;
    const parsed = parsePhoneNumberFromString(fullNumber, country.iso2 as any);
    return {
      valid: parsed?.isValid() ?? false,
      e164: parsed?.format('E.164') ?? fullNumber,
    };
  }, [localNumber, country]);

  // Notify parent whenever value changes
  useEffect(() => {
    onChange(validation.e164, validation.valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.e164, validation.valid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso2.toLowerCase().includes(q),
    );
  }, [search]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const handleLocalChange = (raw: string) => {
    setTouched(true);
    const formatter = new AsYouType(country.iso2 as any);
    const formatted = formatter.input(raw);
    setLocalNumber(formatted.trim());
  };

  const selectCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch('');
  };

  const showError = touched && localNumber.trim().length > 0 && !validation.valid;

  return (
    <div>
      <div className="flex gap-2">
        {/* Country selector button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="input-field flex items-center gap-1.5 pr-2 whitespace-nowrap cursor-pointer"
            aria-label="Select country"
          >
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="text-sm font-medium text-ocean-800">{country.dialCode}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute z-20 mt-1 w-72 rounded-xl bg-white border border-slate-200 shadow-glass-lg overflow-hidden">
                {/* Search box */}
                <div className="relative p-2 border-b border-slate-100">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country, code…"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 outline-none"
                  />
                </div>
                {/* Scrollable list */}
                <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
                  {filtered.length === 0 && (
                    <p className="px-3 py-4 text-sm text-slate-400 text-center">No countries found</p>
                  )}
                  {filtered.map((c) => (
                    <button
                      key={c.iso2}
                      type="button"
                      onClick={() => selectCountry(c)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-ocean-50 transition-colors text-left ${c.iso2 === country.iso2 ? 'bg-ocean-50 font-semibold text-ocean-800' : 'text-slate-700'}`}
                    >
                      <span className="text-lg leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-slate-500">{c.dialCode}</span>
                      {c.iso2 === country.iso2 && <Check className="w-3.5 h-3.5 text-ocean-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Phone input */}
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="tel"
            value={localNumber}
            onChange={(e) => handleLocalChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            className={`input-field pl-10 ${showError ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : ''}`}
          />
        </div>
      </div>
      {showError && (
        <p className="mt-1.5 text-xs text-rose-500">Please enter a valid phone number for {country.name}.</p>
      )}
    </div>
  );
}
