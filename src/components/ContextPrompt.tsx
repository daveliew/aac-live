'use client';

import { ContextType, formatContext } from '@/lib/tiles';

// Emoji mapping for contexts - child-friendly icons
const CONTEXT_EMOJIS: Record<string, string> = {
  restaurant_counter: '🍟',
  restaurant_table: '🍽️',
  playground: '🛝',
  classroom: '📚',
  home_kitchen: '🏠',
  home_living: '🛋️',
  store_checkout: '🛒',
  medical_office: '🏥',
  unknown: '📍',
};

function getContextEmoji(context: string): string {
  return CONTEXT_EMOJIS[context] || '📍';
}

interface ContextOption {
  label: string;
  icon: string;
  context: ContextType | null;
  action?: string;
}

interface ContextPromptProps {
  mode: 'binary' | 'multi_choice';
  primaryContext?: ContextType;
  prompt: string;
  options: ContextOption[];
  onConfirm: (context: ContextType) => void;
  onDismiss: () => void;
  onShowAlternatives?: () => void;
}

export default function ContextPrompt({
  mode,
  primaryContext,
  prompt,
  options,
  onConfirm,
  onDismiss,
  onShowAlternatives,
}: ContextPromptProps) {
  const handleOptionClick = (option: ContextOption) => {
    if (option.action === 'show_alternatives' && onShowAlternatives) {
      onShowAlternatives();
    } else if (option.context) {
      onConfirm(option.context);
    } else {
      onDismiss();
    }
  };

  if (mode === 'binary' && primaryContext) {
    // Binary confirmation: "McDonald's?" with Yes/No
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gray-900/95 rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl border border-white/10">
          {/* Big emoji */}
          <div className="text-7xl text-center mb-4">
            {getContextEmoji(primaryContext)}
          </div>

          {/* Context name as question */}
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            {formatContext(primaryContext)}?
          </h2>

          {/* Yes/No buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => onConfirm(primaryContext)}
              className="flex-1 bg-green-500 hover:bg-green-400 text-white rounded-2xl py-6 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <span className="text-4xl">✓</span>
              <span className="text-xl font-bold">Yes</span>
            </button>

            <button
              onClick={() => onShowAlternatives ? onShowAlternatives() : onDismiss()}
              className="flex-1 bg-red-500 hover:bg-red-400 text-white rounded-2xl py-6 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <span className="text-4xl">✗</span>
              <span className="text-xl font-bold">No</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-choice: "Where are you?" with 3 options
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/95 rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl border border-white/10">
        {/* Prompt */}
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {prompt}
        </h2>

        {/* Option grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {options.filter(o => o.context).slice(0, 3).map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              className="bg-blue-500 hover:bg-blue-400 text-white rounded-2xl py-4 px-2 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <span className="text-3xl">
                {option.context ? getContextEmoji(option.context) : option.icon}
              </span>
              <span className="text-sm font-semibold text-center leading-tight">
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Skip button */}
        <button
          onClick={onDismiss}
          className="w-full py-3 text-gray-400 hover:text-white text-sm font-medium transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
