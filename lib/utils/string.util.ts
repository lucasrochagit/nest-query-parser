export function splitString(param: string, sep: string): string[] {
  return param.split(sep).filter((param: string) => !!param);
}

export function cleanString(str: string, reg: RegExp): string {
  return str.replace(reg, '');
}

export function testString(str: string, reg: RegExp): boolean {
  return reg.test(str);
}
