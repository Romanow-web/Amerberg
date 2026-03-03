import React from 'react';
import { MetricType } from '../types';
import { Button } from './Button';
import { FileCheck, Truck } from 'lucide-react';

interface MetricSelectorProps {
  value: MetricType;
  onChange: (value: MetricType) => void;
  className?: string;
}

export function MetricSelector({ value, onChange, className = '' }: MetricSelectorProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant={value === 'signed_contracts' ? 'primary' : 'outline'}
        onClick={() => onChange('signed_contracts')}
        size="md"
        icon={<FileCheck size={18} />}
      >
        Signed Contracts
      </Button>
      <Button
        variant={value === 'cars_shipped' ? 'primary' : 'outline'}
        onClick={() => onChange('cars_shipped')}
        size="md"
        icon={<Truck size={18} />}
      >
        Cars Shipped
      </Button>
    </div>
  );
}
