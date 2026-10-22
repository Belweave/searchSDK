import { useEffect, useState } from "react";

/** Keep server markup and the first client render identical until this component commits. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
