import { BookOpen, FileText, CheckSquare, Lightbulb } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-2xl text-center px-4">
        <h1 className="text-3xl font-bold mb-4">
          Welcome to Teacher's Assistant
        </h1>
        <p className="text-muted-foreground mb-8">
          Generate print-ready teaching materials for K-3 students in minutes.
          Describe what you want to create, add some inspiration, and let AI do
          the rest.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <FeatureCard
            icon={FileText}
            title="Worksheets"
            description="Practice exercises with customizable difficulty"
          />
          <FeatureCard
            icon={BookOpen}
            title="Lesson Plans"
            description="Structured teaching guides for educators"
          />
          <FeatureCard
            icon={CheckSquare}
            title="Answer Keys"
            description="Complete solutions for easy grading"
          />
          <FeatureCard
            icon={Lightbulb}
            title="AI-Powered"
            description="Smart content tailored to grade level"
          />
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Get started by describing what you want to create in the panel on the
          left.
        </p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card text-left">
      <Icon className="h-6 w-6 text-primary mb-2" />
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
