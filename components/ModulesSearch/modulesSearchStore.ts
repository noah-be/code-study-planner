import { urlParams } from "@/services/learningPlatform/util/urlParams";
import { useEffect } from "react";
import { create } from "zustand";

export interface ModulesSearchStore {
  searchQuery: string;

  filters: {
    onlyMandatoryOrCompulsoryElective: boolean;

    onlyAlternativeAssessment: boolean;
    onlyEarlyAssessment: boolean;

    onlyPassed: boolean;
    onlyFailed: boolean;
    onlyMyStudies: boolean;
    onlyMySemester: boolean;
    onlyNotTaken: boolean;
  };

  actions: {
    setSearchQuery: (query: string) => void;
    setOnlyMandaryOrCompulsoryElective: (value: boolean) => void;
    setOnlyAlternativeAssessment: (value: boolean) => void;
    setOnlyEarlyAssessment: (value: boolean) => void;
    setOnlyPassed: (value: boolean) => void;
    setOnlyFailed: (value: boolean) => void;
    setOnlyMyStudies: (value: boolean) => void;
    setOnlyMySemester: (value: boolean) => void;
    setOnlyNotTaken: (value: boolean) => void;
    clearFilters: () => void;
  };
}
const modulesSearchStore = create<ModulesSearchStore>((set) => ({
  searchQuery: urlParams.get("q") ?? "",

  filters: {
    onlyMandatoryOrCompulsoryElective: urlParams.get("mandatory"),
    onlyAlternativeAssessment: urlParams.get("alternative"),
    onlyEarlyAssessment: urlParams.get("early"),
    onlyPassed: urlParams.get("passed"),
    onlyFailed: urlParams.get("failed"),
    onlyMyStudies: urlParams.get("my-studies"),
    onlyMySemester: urlParams.get("my-semester"),
    onlyNotTaken: urlParams.get("not-taken"),
  },

  actions: {
    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },
    setOnlyMandaryOrCompulsoryElective: (value: boolean) => {
      set((prev) => ({
        filters: {
          ...prev.filters,
          onlyMandatoryOrCompulsoryElective: value,
        },
      }));
    },
    setOnlyAlternativeAssessment: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyAlternativeAssessment: value },
      }));
    },
    setOnlyEarlyAssessment: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyEarlyAssessment: value },
      }));
    },
    setOnlyPassed: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyPassed: value },
      }));
    },
    setOnlyFailed: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyFailed: value },
      }));
    },
    setOnlyMyStudies: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyMyStudies: value },
      }));
    },
    setOnlyMySemester: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyMySemester: value },
      }));
    },
    setOnlyNotTaken: (value: boolean) => {
      set((prev) => ({
        filters: { ...prev.filters, onlyNotTaken: value },
      }));
    },
    clearFilters: () => {
      set({
        filters: {
          onlyMandatoryOrCompulsoryElective: false,
          onlyAlternativeAssessment: false,
          onlyEarlyAssessment: false,
          onlyPassed: false,
          onlyFailed: false,
          onlyMyStudies: false,
          onlyMySemester: false,
          onlyNotTaken: false,
        },
      });
    },
  },
}));

export function useModulesSearchStore() {
  const store = modulesSearchStore();

  useEffect(() => {
    urlParams.set("q", store.searchQuery);
    urlParams.set("mandatory", store.filters.onlyMandatoryOrCompulsoryElective);
    urlParams.set("alternative", store.filters.onlyAlternativeAssessment);
    urlParams.set("early", store.filters.onlyEarlyAssessment);
    urlParams.set("passed", store.filters.onlyPassed);
    urlParams.set("failed", store.filters.onlyFailed);
    urlParams.set("my-studies", store.filters.onlyMyStudies);
    urlParams.set("my-semester", store.filters.onlyMySemester);
    urlParams.set("not-taken", store.filters.onlyNotTaken);
  }, [
    store.searchQuery,
    store.filters.onlyAlternativeAssessment,
    store.filters.onlyEarlyAssessment,
    store.filters.onlyFailed,
    store.filters.onlyMandatoryOrCompulsoryElective,
    store.filters.onlyMySemester,
    store.filters.onlyMyStudies,
    store.filters.onlyPassed,
    store.filters.onlyNotTaken,
  ]);
  return store;
}
