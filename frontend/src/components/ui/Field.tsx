"use client";

interface FieldProps {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  required?: boolean;
  placeholder?: string;
  hint?: string;
}

export default function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="input-glass"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
