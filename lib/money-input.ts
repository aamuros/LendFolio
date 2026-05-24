export function parseMoneyInput(
  value: unknown,
  options: { emptyValue?: number } = {},
): number | string {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return options.emptyValue ?? "";
  }

  const normalizedValue = value.replace(/,/g, "").trim();

  if (normalizedValue === "") {
    return options.emptyValue ?? "";
  }

  const parsedValue = Number(normalizedValue);

  return Number.isNaN(parsedValue) ? normalizedValue : parsedValue;
}
