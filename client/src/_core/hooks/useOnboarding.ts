import { useCallback, useState } from "react";

const STORAGE_KEY = "trendhunter:onboarding";

export type OnboardingStep = "discover" | "watchlist" | "pipeline";

type OnboardingState = {
  discover: boolean;
  watchlist: boolean;
  pipeline: boolean;
  dismissed: boolean;
};

const DEFAULT: OnboardingState = {
  discover: false,
  watchlist: false,
  pipeline: false,
  dismissed: false,
};

function readState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function persistState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(readState);

  const completeStep = useCallback((step: OnboardingStep) => {
    setState((prev) => {
      if (prev[step]) return prev;
      const next = { ...prev, [step]: true };
      persistState(next);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true };
      persistState(next);
      return next;
    });
  }, []);

  const isComplete = state.discover && state.watchlist && state.pipeline;
  const showChecklist = !state.dismissed && !isComplete;

  return { state, completeStep, dismiss, showChecklist, isComplete };
}
