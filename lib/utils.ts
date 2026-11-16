type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const walk = (value: ClassValue) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      classes.push(value);
    }
  };

  for (const input of inputs) walk(input);
  return classes.join(" ");
}
