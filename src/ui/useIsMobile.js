import { useEffect, useState } from "react";

export function useIsMobile(query = "(max-width: 639px)") {
    const get = () => typeof window !== "undefined" && window.matchMedia?.(query).matches;
    const [is, setIs] = useState(get);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setIs(mq.matches);
        mq.addEventListener?.("change", on);
        return () => mq.removeEventListener?.("change", on);
    }, [query]);
    return !!is;
}
