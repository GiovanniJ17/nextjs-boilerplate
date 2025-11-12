import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="card-compact mb-4">
      <div className="flex flex-wrap items-end gap-3">
        {children}
      </div>
    </div>
  );
}

interface FilterItemProps {
  label: string;
  children: ReactNode;
}

export function FilterItem({ label, children }: FilterItemProps) {
  return (
    <div className="flex-1 min-w-[200px]">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}
