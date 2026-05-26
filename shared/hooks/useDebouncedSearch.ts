'use client';

import { useEffect, useState } from 'react';

/**
 * Two-value search state: `immediate` updates on every keystroke (bind to <input>),
 * `value` updates `delay` ms after the user stops typing (bind to the useEffect that
 * triggers the data fetch). Avoids hitting the API on every keystroke.
 *
 * Usage:
 *   const search = useDebouncedSearch('', 300);
 *
 *   <input value={search.immediate} onChange={e => search.setValue(e.target.value)} />
 *
 *   useEffect(() => {
 *     load(); // re-fetch with search.value
 *   }, [search.value]);
 */
export function useDebouncedSearch(initial: string = '', delay: number = 300) {
  const [immediate, setImmediate] = useState(initial);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setValue(immediate), delay);
    return () => clearTimeout(t);
  }, [immediate, delay]);

  return {
    /** Bind this to the <input> value */
    immediate,
    /** Bind this to the useEffect dependency that re-fetches */
    value,
    /** Call from onChange */
    setValue: setImmediate,
    /** Reset both immediately (e.g., clear button) */
    reset: () => { setImmediate(''); setValue(''); },
  };
}
