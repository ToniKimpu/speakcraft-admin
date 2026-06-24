"use client";

import {
  useVocabulariesByPatternExample,
  useAttachVocabularyToExample,
  useDetachVocabularyFromExample,
} from "@/lib/queries/vocabularies";
import { VocabularyCombobox } from "@/components/days/vocabulary-combobox";
import { Skeleton } from "@/components/ui/skeleton";

interface ExampleVocabularySectionProps {
  exampleId: number;
}

export function ExampleVocabularySection({
  exampleId,
}: ExampleVocabularySectionProps) {
  const { data: vocabularies, isLoading } =
    useVocabulariesByPatternExample(exampleId);
  const attach = useAttachVocabularyToExample(exampleId);
  const detach = useDetachVocabularyFromExample(exampleId);

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
