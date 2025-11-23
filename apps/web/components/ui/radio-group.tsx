'use client';

import { createContext, useContext, ReactNode } from 'react';

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function RadioGroup({ value, onValueChange, children, className = '' }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={`space-y-2 ${className}`} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  id: string;
  className?: string;
}

export function RadioGroupItem({ value, id, className = '' }: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');

  const isChecked = context.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      id={id}
      onClick={() => context.onValueChange(value)}
      className={`h-4 w-4 rounded-full border border-gray-300 ${
        isChecked ? 'bg-blue-600 border-blue-600' : 'bg-white'
      } ${className}`}
    >
      {isChecked && (
        <span className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}
