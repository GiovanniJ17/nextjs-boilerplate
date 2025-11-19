/**
 * Template System for Training Sessions
 * Gestisce template predefiniti e salvati dall'utente
 */

export type SessionTemplate = {
  id: string;
  name: string;
  emoji: string;
  type: string;
  phase?: string;
  location?: string;
  blocks?: {
    name: string;
    exercises: {
      name: string;
      discipline_type: string;
      distance_m: string;
      sets: string;
      repetitions: string;
      intensity?: string;
    }[];
  }[];
  metrics?: {
    metric_name: string;
    category: string;
  }[];
  isCustom?: boolean; // Template salvato dall'utente
};

// Template predefiniti comuni
export const defaultTemplates: SessionTemplate[] = [
  {
    id: 'ripetute-100',
    name: '8x100m',
    emoji: '⚡',
    type: 'pista',
    phase: 'velocità',
    location: 'pista',
    blocks: [
      {
        name: '8x100m',
        exercises: [
          {
            name: '100m',
            discipline_type: '100',
            distance_m: '100',
            sets: '1',
            repetitions: '8',
            intensity: '95',
          },
        ],
      },
    ],
  },
  {
    id: 'ripetute-200',
    name: '5x200m',
    emoji: '🔥',
    type: 'pista',
    phase: 'resistenza',
    location: 'pista',
    blocks: [
      {
        name: '5x200m',
        exercises: [
          {
            name: '200m',
            discipline_type: '200',
            distance_m: '200',
            sets: '1',
            repetitions: '5',
            intensity: '90',
          },
        ],
      },
    ],
  },
  {
    id: 'ripetute-300',
    name: '4x300m',
    emoji: '💨',
    type: 'pista',
    phase: 'resistenza',
    location: 'pista',
    blocks: [
      {
        name: '4x300m',
        exercises: [
          {
            name: '300m',
            discipline_type: '300',
            distance_m: '300',
            sets: '1',
            repetitions: '4',
            intensity: '85',
          },
        ],
      },
    ],
  },
  {
    id: 'test-60',
    name: 'Test 60m',
    emoji: '⏱️',
    type: 'test',
    phase: 'valutazione',
    location: 'pista',
    metrics: [
      {
        metric_name: 'Test 60m',
        category: 'test',
      },
    ],
  },
  {
    id: 'palestra-forza',
    name: 'Palestra Forza',
    emoji: '🏋️',
    type: 'palestra',
    phase: 'forza',
    location: 'palestra',
    metrics: [
      {
        metric_name: 'Squat',
        category: 'massimale',
      },
      {
        metric_name: 'Stacco',
        category: 'massimale',
      },
    ],
  },
  {
    id: 'recupero-attivo',
    name: 'Recupero Attivo',
    emoji: '🧘',
    type: 'recupero',
    phase: 'recupero',
    location: 'pista',
    blocks: [
      {
        name: 'Jogging + mobilità',
        exercises: [
          {
            name: 'Jogging leggero',
            discipline_type: 'altro',
            distance_m: '2000',
            sets: '1',
            repetitions: '1',
            intensity: '50',
          },
        ],
      },
    ],
  },
];

/**
 * Ottiene tutti i template (predefiniti + custom)
 */
export function getAllTemplates(): SessionTemplate[] {
  const customTemplates = getCustomTemplates();
  return [...defaultTemplates, ...customTemplates];
}

/**
 * Ottiene i template custom salvati dall'utente
 */
export function getCustomTemplates(): SessionTemplate[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem('custom-session-templates');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading custom templates:', error);
    return [];
  }
}

/**
 * Salva un nuovo template custom
 */
export function saveCustomTemplate(template: Omit<SessionTemplate, 'id' | 'isCustom'>): void {
  const customTemplates = getCustomTemplates();
  const newTemplate: SessionTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isCustom: true,
  };
  
  customTemplates.push(newTemplate);
  localStorage.setItem('custom-session-templates', JSON.stringify(customTemplates));
}

/**
 * Elimina un template custom
 */
export function deleteCustomTemplate(templateId: string): void {
  const customTemplates = getCustomTemplates();
  const filtered = customTemplates.filter(t => t.id !== templateId);
  localStorage.setItem('custom-session-templates', JSON.stringify(filtered));
}

/**
 * Trova un template per ID
 */
export function getTemplateById(templateId: string): SessionTemplate | undefined {
  return getAllTemplates().find(t => t.id === templateId);
}
