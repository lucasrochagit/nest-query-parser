export function isInt(str: string): boolean {
    return /^[\d]+$/.test(str)
}

export function isNumberString(str: string): boolean {
    return /^[-]?[\d]*\.?[\d]*$/.test(str)
}