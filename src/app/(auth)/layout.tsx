import { BookOpen } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          <span className="text-xl font-bold">PMP English</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            Manage your language learning content
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Create and organize daily lessons, spoken patterns, exercises, and
            vocabularies for your students.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          PMP English Admin Panel
        </p>
      </div>
      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-background">
        {children}
      </div>
    </div>
  );
}
