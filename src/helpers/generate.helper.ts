
export const generateRandomString = (length: number): string => {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Length phải là số nguyên dương');
  }

  const char = "ABCDEFGHIJKLMNOPQASTUVWXYZabcgdfghijklmnopqastuvwxyz012345678"; // Giữ nguyên char gốc
  let result = "";
  for (let i = 0; i < length; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }

  return result;
};

export const generateRandomNumber = (length: number): string => {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Length phải là số nguyên dương');
  }

  const char = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }

  return result;
};