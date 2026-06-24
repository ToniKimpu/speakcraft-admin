"use client";

import { useState } from "react";
import {
  useSearchVocabularies,
  useCreateVocabulary,
} from "@/lib/queries/vocabularies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, X } from "lucide-react";
import type { PatternVocabulary } from "@/types/database.types";

interface VocabularyComboboxProps {
  attachedVocabularies: PatternVocabulary[];
  onAttach: (vocabularyId: number) => void;
  onDetach: (vocabularyId: number) => void;
  isAttaching?: boolean;
}

export function VocabularyCombobox({
  attachedVocabularies,
  onAttach,
  onDetach,
  isAttaching,
}: VocabularyComboboxProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEnglish, setNewEnglish] = useState("");
  const [newBurmese, setNewBurmese] = useState("");

  const { data: searchResults, isLoading: searchLoading } =
    useSearchVocabularies(search);
  const createVocab = useCreateVocabulary();

  const attachedIds = new Set(attachedVocabularies.map((v) => v.id));
  const filteredResults = (searchResults ?? []).filter(
    (v) => !attachedIds.has(v.id)
  );

  async function handleCreate() {
    if (!newEnglish || !newBurmese) return;
    const vocab = await createVocab.mutateAsync({
      english_text: newEnglish,
      burmese_text: newBurmese,
    });
    onAttach(vocab.id);
    setNewEnglish("");
    setNewBurmese("");
    setShowCreate(false);
  }

  return (
    <div className="space-y-3">
      {/* Attached vocabularies */}
      <div className="flex flex-wrap gap-1.5">
        {attachedVocabularies.map((vocab) => (
          <Badge key={vocab.id} variant="secondary" className="gap-1">
            {vocab.english_text}
            <button
              onClick={() => onDetach(vocab.id)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {attachedVocabularies.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No vocabularies attached
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vocabularies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Search results */}
      {search.length >= 2 && (
        <div className="max-h-32 overflow-y-auto rounded border">
          {searchLoading ? (
            <div className="flex items-center justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map((vocab) => (
              <button
                key={vocab.id}
                onClick={() => onAttach(vocab.id)}
                disabled={isAttaching}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex justify-between"
              >
                <span>{vocab.english_text}</span>
                <span className="text-muted-foreground">
                  {vocab.burmese_text}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground p-2">
              No results found
            </p>
          )}
        </div>
      )}

      {/* Create new */}
      {showCreate ? (
        <div className="space-y-2 rounded border p-3">
          <Input
            placeholder="English text"
            value={newEnglish}
            onChange={(e) => setNewEnglish(e.target.value)}
          />
          <Input
            placeholder="Burmese text"
            value={newBurmese}
            onChange={(e) => setNewBurmese(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={
                createVocab.isPending || !newEnglish || !newBurmese
              }
            >
              {createVocab.isPending && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Create & Attach
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-3 w-3" />
          Create New Vocabulary
        </Button>
      )}
    </div>
  );
}
