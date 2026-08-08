import { useEffect, useState, useRef } from "react";

/**
 * Wraps any async fetcher (almost always an apiClient call) with
 * loading/error/data state. Every public page uses this instead of
 * importing from data/sampleContent.js.
 *
 * @param {() => Promise<any>} fetcher
 * @param {any[]} deps - re-runs the fetch when these change (e.g. [slug])
 */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcherRef.current()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
