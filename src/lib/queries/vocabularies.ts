"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchVocabularies,
  getVocabulariesByPatternExample,
  getVocabulariesByPatternExercise,
  createVocabulary,
  attachVocabularyToExample,
  detachVocabularyFromExample,
  attachVocabularyToPatternExercise,
  detachVocabularyFromPatternExercise,
} from "@/lib/actions/vocabularies";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function useSearchVocabularies(query: string) {
  return useQuery({
    queryKey: queryKeys.vocabularies.search(query),
    queryFn: () => searchVocabularies(query),
    enabled: query.length >= 2,
  });
}

export function useVocabulariesByPatternExample(exampleId: number) {
  return useQuery({
    queryKey: queryKeys.vocabularies.byPatternExample(exampleId),
    queryFn: () => getVocabulariesByPatternExample(exampleId),
  });
}

export function useVocabulariesByPatternExercise(exerciseId: number) {
  return useQuery({
    queryKey: queryKeys.vocabularies.byPatternExercise(exerciseId),
    queryFn: () => getVocabulariesByPatternExercise(exerciseId),
  });
}

export function useCreateVocabulary() {
  return useMutation({
    mutationFn: (values: {
      english_text: string;
      burmese_text: string;
      audio_path?: string | null;
    }) => createVocabulary(values),
    onError: (error: Error) => {
      toast.error(`Failed to create vocabulary: ${error.message}`);
    },
  });
}

export function useAttachVocabularyToExample(exampleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vocabularyId: number) =>
      attachVocabularyToExample(exampleId, vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.byPatternExample(exampleId),
      });
      toast.success("Vocabulary attached");
    },
    onError: (error: Error) => {
      toast.error(`Failed to attach vocabulary: ${error.message}`);
    },
  });
}

export function useDetachVocabularyFromExample(exampleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vocabularyId: number) =>
      detachVocabularyFromExample(exampleId, vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.byPatternExample(exampleId),
      });
      toast.success("Vocabulary detached");
    },
    onError: (error: Error) => {
      toast.error(`Failed to detach vocabulary: ${error.message}`);
    },
  });
}

export function useAttachVocabularyToPatternExercise(exerciseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vocabularyId: number) =>
      attachVocabularyToPatternExercise(exerciseId, vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.byPatternExercise(exerciseId),
      });
      toast.success("Vocabulary attached");
    },
    onError: (error: Error) => {
      toast.error(`Failed to attach vocabulary: ${error.message}`);
    },
  });
}

export function useDetachVocabularyFromPatternExercise(exerciseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vocabularyId: number) =>
      detachVocabularyFromPatternExercise(exerciseId, vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabularies.byPatternExercise(exerciseId),
      });
      toast.success("Vocabulary detached");
    },
    onError: (error: Error) => {
      toast.error(`Failed to detach vocabulary: ${error.message}`);
    },
  });
}
