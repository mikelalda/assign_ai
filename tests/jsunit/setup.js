// The modules reload the page after some actions, which jsdom cannot do: it
// reports "Not implemented: navigation". That is expected here, not a failure.
const consoleError = console.error;
beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation((...args) => {
        const message = String(args[0] && args[0].message ? args[0].message : args[0]);
        if (!message.includes('Not implemented: navigation')) {
            consoleError(...args);
        }
    });
});

afterEach(() => {
    document.body.innerHTML = '';
});
