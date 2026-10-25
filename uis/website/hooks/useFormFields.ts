"use client";

import { type ChangeEvent, useCallback, useState } from "react";

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Controlled-form state in one place. Replaces the repeated
 * `onChange={(e) => setForm({ ...form, field: e.target.value })}` per input:
 * each field gets `{ name, value, onChange }` from `field("name")`.
 */
export function useFormFields<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = useCallback((event: ChangeEvent<FieldElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const field = useCallback(
    <K extends keyof T & string>(name: K) => ({ name, value: values[name], onChange: handleChange }),
    [values, handleChange],
  );

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, field, reset };
}
