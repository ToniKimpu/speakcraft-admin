import { create } from "zustand";

interface BreadcrumbLabel {
  table: string;
  id: number;
  label: string;
}

interface UIStore {
  breadcrumbLabels: BreadcrumbLabel[];
  setBreadcrumbLabel: (table: string, id: number, label: string) => void;
  getBreadcrumbLabel: (table: string, id: number) => string | undefined;
}

export const useUIStore = create<UIStore>((set, get) => ({
  breadcrumbLabels: [],

  setBreadcrumbLabel: (table, id, label) => {
    set((state) => {
      const existing = state.breadcrumbLabels.findIndex(
        (bl) => bl.table === table && bl.id === id
      );
      const updated = [...state.breadcrumbLabels];
      if (existing >= 0) {
        updated[existing] = { table, id, label };
      } else {
        updated.push({ table, id, label });
      }
      return { breadcrumbLabels: updated };
    });
  },

  getBreadcrumbLabel: (table, id) => {
    return get().breadcrumbLabels.find(
      (bl) => bl.table === table && bl.id === id
    )?.label;
  },
}));
