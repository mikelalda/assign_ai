// Fake of core/notification. Confirmation dialogues are accepted unless a spec
// makes saveCancelPromise reject, which is what Moodle does on Cancel.
export default {
    exception: jest.fn(),
    addNotification: jest.fn(),
    alert: jest.fn(),
    saveCancelPromise: jest.fn(() => Promise.resolve()),
};
