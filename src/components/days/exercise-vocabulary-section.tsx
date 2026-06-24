"use client";

import {
  useVocabulariesByPatternExercise,
  useAttachVocabularyToPatternExercise,
  useDetachVocabularyFromPatternExercise,
} from "@/lib/queries/vocabularies";
import { VocabularyCombobox } from "@/components/days/vocabulary-combobox";
import { Skeleton } from "@/components/ui/skeleton";

interface ExerciseVocabularySectionProps {
  patternExerciseId: number;
}

export function ExerciseVocabularySection({
  patternExerciseId,
}: ExerciseVocabularySectionProps) {
  const { data: vocabularies, isLoading } =
    useVocabulariesByPatternExercise(patternExerciseId);
  const attach = useAttachVocabularyToPatternExercise(patternExerciseId);
  const detach = useDetachVocabularyFromPatternExercise(patternExerciseId);

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <VocabularyCombobox
      attachedVocabularies={vocabularies ?? []}
      onAttach={(vocabId) => attach.mutate(vocabId)}
      onDetach={(vocabId) => detach.mutate(vocabId)}
      isAttaching={attach.isPending}
    />
  );
}
