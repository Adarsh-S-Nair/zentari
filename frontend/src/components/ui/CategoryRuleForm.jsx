import React, { useState, useMemo } from 'react';
import Input from './Input';

const CategoryRuleForm = ({ onSave, onCancel, categories, onSubmitRef, onValidityChange }) => {
  const [fieldType, setFieldType] = useState('description');
  const [operator, setOperator] = useState('contains');
  const [value, setValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const fieldConfig = {
    description: {
      label: 'Description',
      operators: [
        { value: 'contains', label: 'contains' },
        { value: 'starts_with', label: 'starts with' },
        { value: 'ends_with', label: 'ends with' },
        { value: 'equals', label: 'equals' },
        { value: 'regex', label: 'matches pattern' }
      ]
    },
    amount: {
      label: 'Amount',
      operators: [
        { value: 'greater_than', label: 'is greater than' },
        { value: 'less_than', label: 'is less than' },
        { value: 'equals', label: 'is equal to' },
        { value: 'between', label: 'is between' },
        { value: 'not_equals', label: 'is not equal to' }
      ]
    },
    account: {
      label: 'Account',
      operators: [
        { value: 'equals', label: 'is' },
        { value: 'contains', label: 'contains' },
        { value: 'starts_with', label: 'starts with' }
      ]
    },
    merchant: {
      label: 'Merchant',
      operators: [
        { value: 'contains', label: 'contains' },
        { value: 'starts_with', label: 'starts with' },
        { value: 'equals', label: 'equals' },
        { value: 'regex', label: 'matches pattern' }
      ]
    },
    category: {
      label: 'Current Category',
      operators: [
        { value: 'equals', label: 'is' },
        { value: 'not_equals', label: 'is not' },
        { value: 'contains', label: 'contains' }
      ]
    }
  };

  const currentOperators = useMemo(() => {
    return fieldConfig[fieldType]?.operators || [];
  }, [fieldType]);

  const handleFieldTypeChange = (newFieldType) => {
    setFieldType(newFieldType);
    setOperator(fieldConfig[newFieldType]?.operators[0]?.value || 'contains');
    setValue('');
  };

  const handleSubmit = () => {
    if (!value.trim() || !selectedCategory) return;

    const rule = {
      field: fieldType,
      operator,
      value: value.trim(),
      category: selectedCategory,
      enabled: true
    };

    onSave(rule);
  };

  // Expose submit function to parent component
  React.useImperativeHandle(onSubmitRef, () => ({
    submit: handleSubmit,
    isValid: value.trim() && selectedCategory
  }));

  // Notify parent of validity changes
  React.useEffect(() => {
    if (onValidityChange) {
      onValidityChange(value.trim() && selectedCategory);
    }
  }, [value, selectedCategory, onValidityChange]);

  const renderValueInput = () => {
    if (fieldType === 'amount' && operator === 'between') {
      const [min, max] = value.split(',');
      return (
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            placeholder="Min"
            value={min || ''}
            onChange={(e) => setValue(`${e.target.value},${max || ''}`)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Max"
            value={max || ''}
            onChange={(e) => setValue(`${min || ''},${e.target.value}`)}
          />
        </div>
      );
    }

    const isNumeric = fieldType === 'amount';
    return (
      <Input
        type={isNumeric ? 'number' : 'text'}
        step={isNumeric ? '0.01' : undefined}
        placeholder={isNumeric ? 'Enter amount' : `Enter ${fieldConfig[fieldType]?.label.toLowerCase()}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-6 text-sm" style={{ color: 'var(--color-text-primary)' }}>
      {/* IF Section */}
      <div className="space-y-3">
        <h3 className="text-base font-medium">IF...</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Field Type */}
          <Input
            type="select"
            value={fieldType}
            onChange={(e) => handleFieldTypeChange(e.target.value)}
            options={Object.entries(fieldConfig).map(([key, config]) => ({
              value: key,
              label: config.label
            }))}
          />

          {/* Operator */}
          <Input
            type="select"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            options={currentOperators.map((op) => ({
              value: op.value,
              label: op.label
            }))}
          />

          {/* Value */}
          {renderValueInput()}
        </div>
      </div>

      {/* THEN Section */}
      <div className="space-y-3">
        <h3 className="text-base font-medium">THEN categorize as...</h3>
        <Input
          type="select"
          value={selectedCategory?.id || ''}
          onChange={(e) => {
            const catId = e.target.value;
            const category = categories?.find(c => c.id === catId);
            setSelectedCategory(category);
          }}
          options={[
            { value: '', label: 'Select a category' },
            ...(categories?.map((c) => ({
              value: c.id,
              label: c.name
            })) || [])
          ]}
        />
      </div>

      {/* Preview */}
      {value && selectedCategory && (
        <div 
          className="border rounded-md p-4 text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-secondary)'
          }}
        >
          If <strong>{fieldConfig[fieldType]?.label.toLowerCase()}</strong> 
          <span className="mx-1">{currentOperators.find(op => op.value === operator)?.label}</span>
          <code 
            className="px-1 rounded"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            {value}
          </code>, 
          then categorize as <strong>{selectedCategory.name}</strong>.
        </div>
      )}
    </div>
  );
};

export default CategoryRuleForm;
