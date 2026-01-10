'use client';

import { ContextType } from '@/lib/tiles';

interface LocationPickerProps {
  currentContext: ContextType | null;
  onSelect: (context: ContextType) => void;
  onClose: () => void;
}

// Available context options with emoji and label
const LOCATION_OPTIONS: { context: ContextType; emoji: string; label: string }[] = [
  { context: 'restaurant_counter', emoji: '🍟', label: 'Restaurant' },
  { context: 'playground', emoji: '🛝', label: 'Playground' },
  { context: 'home_kitchen', emoji: '🏠', label: 'Home' },
  { context: 'classroom', emoji: '📚', label: 'School' },
  { context: 'store_checkout', emoji: '🛒', label: 'Store' },
  { context: 'medical_office', emoji: '🏥', label: 'Doctor' },
];

export default function LocationPicker({ currentContext, onSelect, onClose }: LocationPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-white text-xl font-bold">Where are you?</h2>
          <p className="text-white/60 text-sm mt-1">Tap to select your location</p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {LOCATION_OPTIONS.map(({ context, emoji, label }) => {
            const isSelected = context === currentContext;
            return (
              <button
                key={context}
                onClick={() => onSelect(context)}
                className={`
                  flex flex-col items-center justify-center
                  p-4 rounded-xl
                  transition-all duration-200
                  active:scale-95
                  ${isSelected
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-white/10 hover:bg-white/20'
                  }
                `}
              >
                <span className="text-3xl mb-1">{emoji}</span>
                <span className="text-white font-medium text-sm">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-white/60 text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
