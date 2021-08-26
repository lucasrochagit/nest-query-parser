export function isInt(str: string): boolean {
  return /^[\d]+$/.test(str);
}

export function isNumberString(str: string): boolean {
  return /^[-]?[\d]*\.?[\d]*$/.test(str);
}

export function isISODate(str: string): boolean {
  return /^(19[6-9]\d|2\d\d\d)-(0[1-9]|1[1-2])-(0[1-9]|1\d|2\d|3[0-1])$/.test(
    str
  );
}

export function isISODateTime(str: string): boolean {
  return /^(19[6-9]\d|2\d\d\d)-(0[1-9]|1[1-2])-(0[1-9]|1\d|2\d|3[0-1])T(0\d|1\d|2[0-3]):([0-5]\d):([0-5]\d).(\d\d\d)(|Z)$/.test(
    str
  );
}
