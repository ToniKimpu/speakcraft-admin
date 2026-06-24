"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePattern } from "@/lib/queries/patterns";
import {
  usePatternExamplesByPattern,
  useSoftDeletePatternExample,
} from "@/lib/queries/pattern-examples";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ExampleFormSheet } from "@/components/days/example-form-sheet";
import { ExampleVocabularySection } from "@/components/days/example-vocabulary-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PatternExample } from "@/types/database.types";
import { resolveAudioUrl } from "@/lib/constants";

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ dayId: string; lessonId: string; patternId: string }>;
}) {
  const {
    dayId: dayIdStr,
    lessonId: lessonIdStr,
    patternId: patternIdStr,
  } = use(params);
  const dayId = Number(dayIdStr);
  const lessonId = Number(lessonIdStr);
  const patternId = Number(patternIdStr);
  const router = useRouter();
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  const { data: pattern, isLoading: patternLoading } = usePattern(patternId);
  const { data: examples, isLoading: examplesLoading } =
    usePatternExamplesByPattern(patternId);
  const deleteExample = useSoftDeletePatternExample(patternId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<PatternExample | null>(
    null
  );
  const [deletingExample, setDeletingExample] =
    useState<PatternExample | null>(null);
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (pattern) {
      setBreadcrumbLabel("patterns", pattern.id, pattern.pattern);
    }
  }, [pattern, setBreadcrumbLabel]);

  function toggleExpanded(exampleId: number) {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(exampleId)) {
        next.delete(exampleId);
      } else {
        next.add(exampleId);
      }
      return next;
    });
  }

  const columns: ColumnDef<PatternExample>[] = [
    {
      accessorKey: "english_text",
      header: "English",
      cell: ({ row }) => (
        <span className="font-medium max-w-xs truncate block">
          {row.getValue("english_text")}
        </span>
      ),
    },
    {
      accessorKey: "burmese_text",
      header: "Burmese",
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-xs truncate block">
          {row.getValue("burmese_text") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "practicable",
      header: "Practicable",
      cell: ({ row }) => (
        <Badge variant={row.getValue("practicable") ? "default" : "secondary"}>
          {row.getValue("practicable") ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      id: "vocabularies",
      header: "Vocab",
      cell: ({ row }) => {
        const example = row.original;
        const isExpanded = expandedExamples.has(example.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(example.id);
            }}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </Button>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const example = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingExample(example);
                  setFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingExample(example)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (patternLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!pattern) return <p>Pattern not found.</p>;

  const audioUrl = resolveAudioUrl(pattern.file_path);

  return (
    <div className="space-y-4">
      <PageHeader title={pattern.pattern} description={pattern.title || undefined}>
        <Button
          onClick={() => {
            setEditingExample(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Example
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/days/${dayId}/lessons/${lessonId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lesson
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pattern Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pattern.description && (
            <div>
              <span className="text-muted-foreground">Description: </span>
              {pattern.description}
            </div>
          )}
          {audioUrl && (
            <div>
              <span className="text-muted-foreground">File Path: </span>
              <audio controls src={audioUrl} className="inline-block h-8 mt-1" />
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Self Practicable: </span>
            <Badge variant={pattern.self_practicable ? "default" : "secondary"}>
              {pattern.self_practicable ? "Yes" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          Examples ({examples?.length ?? 0})
        </h2>
        <DataTable
          columns={columns}
          data={examples ?? []}
          isLoading={examplesLoading}
          emptyMessage="No examples yet. Add your first example."
        />

        {/* Expanded vocabulary sections */}
        {(examples ?? []).map((example) => {
          if (!expandedExamples.has(example.id)) return null;
          return (
            <Collapsible key={example.id} open>
              <CollapsibleTrigger className="w-full text-left px-4 py-2 bg-muted/50 rounded text-sm font-medium">
                Vocabularies for: &quot;{example.english_text.substring(0, 50)}
                ...&quot;
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 py-3 border rounded-b">
                <ExampleVocabularySection exampleId={example.id} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <ExampleFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        patternId={patternId}
        example={editingExample}
      />

      <DeleteConfirmDialog
        open={!!deletingExample}
        onOpenChange={(open) => !open && setDeletingExample(null)}
        title="Delete this example?"
        description={`"${deletingExample?.english_text.substring(0, 50)}..." will be soft-deleted.`}
        onConfirm={() => {
          if (deletingExample) {
            deleteExample.mutate(deletingExample.id);
            setDeletingExample(null);
          }
        }}
        isLoading={deleteExample.isPending}
      />
    </div>
  );
}
