"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExercise } from "@/lib/queries/exercises";
import {
  usePatternExercisesByExercise,
  useSoftDeletePatternExercise,
} from "@/lib/queries/pattern-exercises";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PatternExerciseFormSheet } from "@/components/days/pattern-exercise-form-sheet";
import { ExerciseVocabularySection } from "@/components/days/exercise-vocabulary-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PatternExercise } from "@/types/database.types";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ dayId: string; exerciseId: string }>;
}) {
  const { dayId: dayIdStr, exerciseId: exerciseIdStr } = use(params);
  const dayId = Number(dayIdStr);
  const exerciseId = Number(exerciseIdStr);
  const router = useRouter();
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  const { data: exercise, isLoading: exerciseLoading } =
    useExercise(exerciseId);
  const { data: patternExercises, isLoading: peLoading } =
    usePatternExercisesByExercise(exerciseId);
  const deletePE = useSoftDeletePatternExercise(exerciseId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPE, setEditingPE] = useState<PatternExercise | null>(null);
  const [deletingPE, setDeletingPE] = useState<PatternExercise | null>(null);
  const [expandedPEs, setExpandedPEs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (exercise) {
      setBreadcrumbLabel("exercises", exercise.id, exercise.exercise_name);
    }
  }, [exercise, setBreadcrumbLabel]);

  function toggleExpanded(peId: number) {
    setExpandedPEs((prev) => {
      const next = new Set(prev);
      if (next.has(peId)) {
        next.delete(peId);
      } else {
        next.add(peId);
      }
      return next;
    });
  }

  const columns: ColumnDef<PatternExercise>[] = [
    {
      accessorKey: "burmese_text",
      header: "Burmese (Question)",
      cell: ({ row }) => (
        <span className="max-w-xs truncate block">
          {row.getValue("burmese_text")}
        </span>
      ),
    },
    {
      accessorKey: "english_text",
      header: "English (Answer)",
      cell: ({ row }) => (
        <span className="font-medium max-w-xs truncate block">
          {row.getValue("english_text")}
        </span>
      ),
    },
    {
      accessorKey: "words",
      header: "Words",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.getValue("words") || "—"}
        </span>
      ),
    },
    {
      id: "vocabularies",
      header: "Vocab",
      cell: ({ row }) => {
        const pe = row.original;
        const isExpanded = expandedPEs.has(pe.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(pe.id);
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
        const pe = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingPE(pe);
                  setFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingPE(pe)}
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

  if (exerciseLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exercise) return <p>Exercise not found.</p>;

  return (
    <div className="space-y-4">
      <PageHeader title={exercise.exercise_name}>
        <Button
          onClick={() => {
            setEditingPE(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Pattern Exercise
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/days/${dayId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Day
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={patternExercises ?? []}
        isLoading={peLoading}
        emptyMessage="No pattern exercises yet. Add your first one."
      />

      {/* Expanded vocabulary sections */}
      {(patternExercises ?? []).map((pe) => {
        if (!expandedPEs.has(pe.id)) return null;
        return (
          <Collapsible key={pe.id} open>
            <CollapsibleTrigger className="w-full text-left px-4 py-2 bg-muted/50 rounded text-sm font-medium">
              Vocabularies for: &quot;{pe.burmese_text.substring(0, 50)}
              ...&quot;
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 py-3 border rounded-b">
              <ExerciseVocabularySection patternExerciseId={pe.id} />
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <PatternExerciseFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        exerciseId={exerciseId}
        patternExercise={editingPE}
      />

      <DeleteConfirmDialog
        open={!!deletingPE}
        onOpenChange={(open) => !open && setDeletingPE(null)}
        title="Delete this pattern exercise?"
        onConfirm={() => {
          if (deletingPE) {
            deletePE.mutate(deletingPE.id);
            setDeletingPE(null);
          }
        }}
        isLoading={deletePE.isPending}
      />
    </div>
  );
}
