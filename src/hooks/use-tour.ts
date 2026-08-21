import { useEffect, useState } from "react";
import { getTourState, subscribeTour } from "@/lib/tour";

export function useTour() {
  const [state, setState] = useState(getTourState);

  useEffect(() => subscribeTour(() => setState({ ...getTourState() })), []);

  return state;
}
