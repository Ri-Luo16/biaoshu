/**
 * 步骤导航条组件
 */
import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface StepBarProps {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function StepBar({ steps, currentStep, onStepClick }: StepBarProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        
        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center relative z-10">
              <button
                onClick={() => onStepClick(index)}
                disabled={index > currentStep}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : isActive
                      ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-xl shadow-indigo-50 ring-4 ring-indigo-50'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                } ${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span>{String(index + 1).padStart(2, '0')}</span>
                )}
              </button>
              <span className={`absolute -bottom-7 whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {step}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-4 relative top-0 bg-slate-100">
                <div 
                  className="absolute inset-0 bg-indigo-600 transition-all duration-700 ease-in-out" 
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

