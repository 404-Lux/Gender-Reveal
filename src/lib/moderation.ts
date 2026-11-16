/**
 * Input Sanitization, Formula-Injection Guard, and Basic EN/TL Profanity Flagging
 */

const PROFANITY_PATTERNS: RegExp[] = [
  /\b(fuck|shit|bitch|asshole|cunt|dick|pussy|whore|slut|bastard|nigger|faggot|retard)\b/i,
  /\b(putang\s*ina|putangina|tangina|gago|gaga|ulol|tarantado|tanga|bobo|boba|pakyu|hindot|kantot|kupal|punyeta|leche|bwisit|animal\s+ka|hayop\s+ka)\b/i,
];

export function collapseControlChars(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeSheetFormula(value: string): string {
  if (!value) return '';
  const firstChar = value.charAt(0);
  if (
    firstChar === '=' ||
    firstChar === '+' ||
    firstChar === '-' ||
    firstChar === '@' ||
    firstChar === '\t' ||
    firstChar === '\r'
  ) {
    return `'${value}`;
  }
  return value;
}

export function containsProfanityOrSlur(text: string): boolean {
  if (!text) return false;
  return PROFANITY_PATTERNS.some((re) => re.test(text));
}
