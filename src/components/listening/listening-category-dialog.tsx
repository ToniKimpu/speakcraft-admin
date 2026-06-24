"use client";

import { useState } from "react";
import {
  useListeningCategories,
  useCreateListeningCategory,
  useUpdateListeningCategory,
  useSoftDeleteListeningCategory,
  useRestoreListeningCategory,
} from "@/lib/queries/listening-categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";

interface ListeningCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListeningCategoryDialog({
  open,
  onOpenChange,
}: ListeningCategoryDialogProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const { data, isLoading } = useListeningCategories({ showDeleted });
  const create = useCreateListeningCategory();
  const update = useUpdateListeningCategory();
  const softDelete = useSoftDeleteListeningCategory();
  const restore = useRestoreListeningCategory();

  async function handleCreate() {
    if (!newName.trim()) return;
    await create.mutateAsync(newName.trim());
    setNewName("");
  }

  async function handleUpdate(id: number) {
    if (!editingName.trim()) return;
    await update.mutateAsync({ id, name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={create.isPending || !newName.trim()}
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Category list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </p>
          ) : data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No categories yet.
            </p>
          ) : (
            data?.data.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleUpdate(cat.id)
                      }
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleUpdate(cat.id)}
                      disabled={update.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 text-sm ${cat.is_deleted ? "text-muted-foreground line-through" : ""}`}
                    >
                      {cat.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditingName(cat.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {cat.is_deleted ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => restore.mutate(cat.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => softDelete.mutate(cat.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Show deleted toggle */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Switch
            id="show-deleted-cats"
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
          />
          <Label htmlFor="show-deleted-cats" className="text-sm">
            Show deleted
          </Label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
