// Fake of core/str: a string is its identifier in brackets, "[identifier]".
export const get_string = jest.fn(async(key) => `[${key}]`);
export const get_strings = jest.fn(async(requests) => requests.map((request) => `[${request.key}]`));
export const getString = get_string;
export const getStrings = get_strings;
