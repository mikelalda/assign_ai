// Fake of core/ajax. The specs give the answer of each web service with
// setResponses({methodname: value | (args) => value}); a thrown error or a
// rejected promise is a failed call. Like Moodle's, the promises it returns
// also have the jQuery done() and fail() methods.

let responses = {};

/**
 * Give a native promise the done() and fail() methods of a jQuery promise.
 *
 * @param {Promise} promise
 * @returns {Promise}
 */
const withJqueryMethods = (promise) => {
    promise.done = (callback) => {
        promise.then(callback, () => null);
        return promise;
    };
    promise.fail = (callback) => {
        promise.catch(callback);
        return promise;
    };
    return promise;
};

const respond = ({methodname, args}) => withJqueryMethods(Promise.resolve().then(() => {
    if (!(methodname in responses)) {
        throw new Error(`No answer set for ${methodname}`);
    }
    const answer = responses[methodname];
    return typeof answer === 'function' ? answer(args) : answer;
}));

const call = jest.fn((requests) => requests.map(respond));

/**
 * Set the answers of the web services, replacing the previous ones.
 *
 * @param {object} map
 */
export const setResponses = (map) => {
    responses = {...map};
};

/**
 * The arguments of every call to one web service, in order.
 *
 * @param {string} methodname
 * @returns {object[]}
 */
export const callsTo = (methodname) => call.mock.calls
    .flatMap(([requests]) => requests)
    .filter((request) => request.methodname === methodname)
    .map((request) => request.args);

export default {call};
