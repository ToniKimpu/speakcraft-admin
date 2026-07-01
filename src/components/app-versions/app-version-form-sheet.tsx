"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  appVersionFormSchema,
  type AppVersionFormValues,
} from "@/lib/validations/app-version";
import {
  useCreateAppVersion,
  useUpdateAppVersion,
} from "@/lib/queries/app-versions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { AppVersion, AppVersionInsert } from "@/types/database.types";

interface AppVersionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version?: AppVersion | null;
  suggestedBuild?: number;
}

function emptyDefaults(
  version: AppVersion | null | undefined,
  suggestedBuild: number
): AppVersionFormValues {
  return {
    version_name: version?.version_name ?? "",
    build_number: version?.build_number ?? suggestedBuild,
    app_path: version?.app_path ?? "",
    telegram_path: version?.telegram_path ?? "",
    audio_path: version?.audio_path ?? "",
    release_notes: version?.release_notes ?? "",
    force_update: version?.force_update ?? false,
  };
}

export function AppVersionFormSheet({
  open,
  onOpenChange,
  version,
  suggestedBuild = 1,
}: AppVersionFormSheetProps) {
  const isEditing = !!version;
  const create = useCreateAppVersion();
  const update = useUpdateAppVersion();
  const isLoading = create.isPending || update.isPending;

  const form = useForm<AppVersionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(appVersionFormSchema) as any,
    defaultValues: emptyDefaults(version, suggestedBuild),
  });

  useEffect(() => {
    if (open) form.reset(emptyDefaults(version, suggestedBuild));
  }, [open, version, suggestedBuild, form]);

  async function onSubmit(values: AppVersionFormValues) {
    const payload: AppVersionInsert = {
      version_name: values.version_name.trim(),
      build_number: values.build_number,
      app_path: values.app_path.trim(),
      force_update: values.force_update,
      telegram_path: values.telegram_path.trim() || null,
      audio_path: values.audio_path.trim() || null,
      release_notes: values.release_notes.trim() || null,
    };

    if (isEditing && version) {
      await update.mutateAsync({ id: version.id, values: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Version" : "Add Version"}
          </SheetTitle>
          <SheetDescription>
            The app shows the highest build number; raise it to roll out an
            update.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Version name{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="build_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Build number{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="app_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Download URL (APK){" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://…/app.apk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telegram_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://t.me/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audio_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audio URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…/voice.mp3" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Optional voice note played on the update screen.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="release_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="ဘာတွေ အသစ်ပါလဲ… (optional)"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Shown on the update screen. Leave blank for the default
                      message.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="force_update"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Force update</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Hide “Skip” — users must update to continue.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Version"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
