import React from 'react';
import { OnboardingStep } from '../types/exporta';
import { CheckCircle2, Circle, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { NavTab } from './Sidebar';

interface OnboardingWidgetProps {
  steps: OnboardingStep[];
  onNavigateTab: (tab: NavTab) => void;
  onToggleStep: (id: number) => void;
}

export const OnboardingWidget: React.FC<OnboardingWidgetProps> = ({
  steps,
  onNavigateTab,
  onToggleStep,
}) => {
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Next incomplete step
  const nextStep = steps.find((s) => !s.completed) || steps[steps.length - 1];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700/80 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
              REHBERLİ BAŞLANGIÇ
            </span>
            <span className="text-xs text-slate-400">Contextual Onboarding</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>İlk sevkiyatınızı 7 adımda tamamlayın</span>
            <Sparkles className="w-5 h-5 text-teal-400" />
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Tek ortak veri kaynağında müşteri, ürün ve sevkiyat verisini tanımlayın; 7 ihraç belgenizi otomatik üretin.
          </p>
        </div>

        {/* Progress Bar & Next Action CTA */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shrink-0 text-right min-w-[240px]">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5">
            <span>İlerleme Durumu</span>
            <span className="text-teal-400 font-mono">{completedCount} / {steps.length} Adım</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-teal-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <button
            onClick={() => onNavigateTab(nextStep.actionRoute as NavTab)}
            className="w-full py-2 px-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-xs"
          >
            <span>Şimdi Yap: {nextStep.title}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 7 Step Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 mt-5">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              onClick={() => onToggleStep(step.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative group ${
                step.completed
                  ? 'bg-slate-800/40 border-teal-500/40 hover:border-teal-400'
                  : 'bg-slate-800/90 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-mono font-bold ${step.completed ? 'text-teal-400' : 'text-slate-400'}`}>
                  0{step.id}
                </span>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                )}
              </div>
              <h4 className={`text-xs font-semibold leading-tight line-clamp-2 ${step.completed ? 'text-slate-300 line-through' : 'text-white'}`}>
                {step.title}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateTab(step.actionRoute as NavTab);
                }}
                className="mt-2 text-[10px] text-teal-400 font-medium hover:underline flex items-center"
              >
                <span>Aç</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
