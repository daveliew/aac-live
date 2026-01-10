'use client';

import { AffirmationResult, ContextType } from '@/lib/tiles';

interface AffirmationUIProps {
    affirmation: AffirmationResult;
    onConfirm: (context: ContextType) => void;
    onDismiss: () => void;
}

export default function AffirmationUI({ affirmation, onConfirm, onDismiss }: AffirmationUIProps) {
    if (!affirmation.uiOptions) return null;

    const { type, prompt, options } = affirmation.uiOptions;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-2xl font-bold text-center mb-6 text-white">
                    {prompt}
                </h2>

                <div className={`grid gap-4 ${type === 'binary' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {options.map((option, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (option.context) {
                                    onConfirm(option.context);
                                } else {
                                    onDismiss();
                                }
                            }}
                            className="flex items-center justify-center gap-3 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all text-xl font-semibold text-white active:scale-95"
                        >
                            <span className="text-3xl">{option.icon}</span>
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={onDismiss}
                    className="mt-6 w-full py-3 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}
