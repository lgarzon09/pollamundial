import { PredictionsTabs } from "@/components/PredictionsTabs";

export default function PrediccionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <PredictionsTabs />
      {children}
    </div>
  );
}
