// Helpers shared by the specs.
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const COMPONENT = 'local_assign_ai';
const TEMPLATES = path.join(__dirname, '..', '..', 'templates');

/**
 * The source of a template: this plugin's own, or nothing for any other component.
 *
 * @param {string} name Template name, such as "local_assign_ai/foo".
 * @returns {string}
 */
const templateSource = (name) => {
    const [component, file] = name.trim().split('/');
    if (component !== COMPONENT) {
        return '';
    }
    return fs.readFileSync(path.join(TEMPLATES, `${file}.mustache`), 'utf8');
};

/**
 * Render one of the plugin's templates near enough to how Moodle does it: the
 * real markup, {{#str}} printing "[identifier]", the other helpers printing nothing.
 *
 * @param {string} name Template name, such as "local_assign_ai/foo".
 * @param {object} context
 * @returns {string}
 */
const renderTemplate = (name, context = {}) => {
    const view = Object.assign({
        str: () => (text) => `[${text.split(',')[0].trim()}]`,
        pix: () => () => '',
        js: () => () => '',
        quote: () => (text, render) => JSON.stringify(render(text)),
        uniqid: 'uniq',
    }, context);
    return Mustache.render(templateSource(name), view, templateSource);
};

/**
 * Load a module written with define([...], factory), handing it the same
 * dependencies Moodle would: the default export of a module that only has one,
 * the module itself otherwise.
 *
 * @param {string} name Module name, such as "local_assign_ai/foo".
 * @returns {*} What the factory returns.
 */
const loadAmd = (name) => {
    let exported;
    global.define = (deps, factory) => {
        exported = factory(...deps.map((dep) => {
            const module = require(dep);
            const keys = Object.keys(module).filter((key) => key !== '__esModule');
            return module.__esModule && keys.length === 1 && keys[0] === 'default' ? module.default : module;
        }));
    };
    try {
        require(name);
    } finally {
        delete global.define;
    }
    return exported;
};

/**
 * Let pending promises and zero-delay timers run.
 *
 * @param {number} rounds
 */
const flush = async(rounds = 10) => {
    for (let i = 0; i < rounds; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};

/**
 * A stand-in for EventSource that the specs drive by hand.
 */
class FakeEventSource {
    constructor(url) {
        this.url = url;
        this.listeners = {};
        this.closed = false;
        FakeEventSource.instances.push(this);
    }

    addEventListener(type, listener) {
        (this.listeners[type] = this.listeners[type] || []).push(listener);
    }

    removeEventListener(type, listener) {
        this.listeners[type] = (this.listeners[type] || []).filter((other) => other !== listener);
    }

    /**
     * Deliver an event to the listeners, and wait for what they started.
     *
     * @param {string} type
     * @param {string} data
     */
    async emit(type, data = '') {
        await Promise.all((this.listeners[type] || []).map((listener) => listener({type, data})));
        await flush();
    }

    close() {
        this.closed = true;
    }
}
FakeEventSource.instances = [];

module.exports = {renderTemplate, loadAmd, flush, FakeEventSource};
