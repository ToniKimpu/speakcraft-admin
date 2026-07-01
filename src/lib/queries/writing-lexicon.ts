"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWritingLexicon,
  getWritingLexiconEntry,
  createWritingLexiconEntry,
  updateWritingLexiconEntry,
  softDeleteWritingLexiconEntry,
  restoreWritingLexiconEntry,
} from "@/lib/actions/writing-lexicon";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type {
  WritingLexiconInsert,
  WritingLexiconUpdate,
} from "@/types/database.types";

export function useWritingLexicon(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.writingLexicon.list({
      showDeleted: options?.showDeleted,
    }),
    queryFn: () => getWritingLexicon(options),
  });
}

export function useWritingLexiconEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.writingLexicon.detail(id),
    queryFn: () => getWritingLexiconEntry(id),
    enabled: !!id,
  });
}

export function useCreateWritingLexiconEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: WritingLexiconInsert) =>
      createWritingLexiconEntry(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLexicon.all });
      toast.success("Lexicon entry created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create entry: ${error.message}`);
    },
  });
}

export function useUpdateWritingLexiconEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: WritingLexiconUpdate;
    }) => updateWritingLexiconEntry(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLexicon.all });
      toast.success("Lexicon entry updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });
}

export function useSoftDeleteWritingLexiconEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteWritingLexiconEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLexicon.all });
      toast.success("Lexicon entry deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });
}

export function useRestoreWritingLexiconEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreWritingLexiconEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLexicon.all });
      toast.success("Lexicon entry restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore entry: ${error.message}`);
    },
  });
}
