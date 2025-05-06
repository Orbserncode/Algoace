// src/app/agents/_components/json-input.tsx
'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface JsonInputProps {
    value?: Record<string, any>; // Accepts JSON object
    onChange: (value: Record<string, any> | undefined) => void; // Sends back object or undefined
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function JsonInput({ value, onChange, placeholder, disabled, className }: JsonInputProps) {
    const [textValue, setTextValue] = useState(() => value ? JSON.stringify(value, null, 2) : '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Update text area if the external value changes (e.g., on form reset)
        // Avoid unnecessary updates if the parsed value matches the current text
        try {
            const currentParsed = textValue ? JSON.parse(textValue) : undefined;
            if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
                 setTextValue(value ? JSON.stringify(value, null, 2) : '');
                 setError(null); // Clear error if external value resets it
            }
        } catch {
            // If current text is invalid, still update with the new external value
            setTextValue(value ? JSON.stringify(value, null, 2) : '');
            setError(null);
        }
    }, [value, textValue]); // Depends on external value and internal text

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = event.target.value;
        setTextValue(newText);
        try {
            if (newText.trim() === '') {
                onChange(undefined); // Clear value if empty
                setError(null);
            } else {
                const parsed = JSON.parse(newText);
                 // Ensure it's an object (or handle arrays if needed)
                 if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                     onChange(parsed);
                     setError(null);
                 } else {
                     setError("Input must be a valid JSON object.");
                     onChange(undefined); // Invalid format, send undefined
                 }
            }
        } catch (e) {
            setError("Invalid JSON format.");
            onChange(undefined); // Parsing failed, send undefined
        }
    };

    return (
        <div className="w-full">
            <Textarea
                value={textValue}
                onChange={handleChange}
                placeholder={placeholder || 'Enter JSON object...'}
                disabled={disabled}
                className={cn("font-mono text-xs min-h-[100px]", className, error && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!error}
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}

    