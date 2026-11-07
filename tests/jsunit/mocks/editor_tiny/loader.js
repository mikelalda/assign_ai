// Fake of editor_tiny/loader. Specs choose what getTinyMCE() resolves to.
export const getTinyMCE = jest.fn(() => Promise.reject(new Error('TinyMCE is not loaded')));
