export const TRAINING_TYPES = [
  { value: 'pista', label: 'Pista' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
] as const;

export type TrainingTypeValue = (typeof TRAINING_TYPES)[number]['value'];

const TRAINING_TYPE_LABEL_BY_VALUE = TRAINING_TYPES.reduce<Record<string, string>>(
  (acc, type) => {
    acc[type.value] = type.label;
    return acc;
  },
  {}
);

export function getTrainingTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Allenamento';
  return TRAINING_TYPE_LABEL_BY_VALUE[value] ?? value;
}
