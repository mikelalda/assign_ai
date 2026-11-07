// A stand-in for Moodle modals: real DOM nodes in the page, and the few
// methods of their jQuery wrappers that the plugin uses.

export const HIDDEN_EVENT = 'modal:hidden';

/**
 * Wrap an element in an array with some jQuery-like methods.
 *
 * @param {Element} element
 * @returns {Array}
 */
const wrap = (element) => {
    const api = [element];
    api.jquery = 'fake';
    api.addClass = (classes) => {
        element.classList.add(...classes.split(/\s+/).filter(Boolean));
        return api;
    };
    api.find = (selector) => {
        const found = Array.from(element.querySelectorAll(selector));
        found.jquery = 'fake';
        return found;
    };
    api.css = () => api;
    api.on = (event, selector, handler) => {
        if (typeof selector === 'function') {
            element.addEventListener(event, selector);
            return api;
        }
        element.addEventListener(event, (e) => {
            const target = e.target.closest(selector);
            if (target && element.contains(target)) {
                handler.call(target, e);
            }
        });
        return api;
    };
    return api;
};

export class FakeModal {
    constructor({title = '', body = '', footer = ''} = {}) {
        this.root = document.createElement('div');
        this.root.className = 'modal';
        this.root.innerHTML = '<h5 class="modal-title"></h5><div class="modal-body"></div><div class="modal-footer"></div>';
        this.root.querySelector('.modal-title').textContent = title;
        this.root.querySelector('.modal-body').innerHTML = body;
        this.root.querySelector('.modal-footer').innerHTML = footer;
        this.shown = false;
        this.destroyed = false;
        document.body.appendChild(this.root);
    }

    getRoot() {
        return wrap(this.root);
    }

    getBody() {
        return wrap(this.root.querySelector('.modal-body'));
    }

    getFooter() {
        return wrap(this.root.querySelector('.modal-footer'));
    }

    show() {
        this.shown = true;
    }

    hide() {
        this.shown = false;
        this.root.dispatchEvent(new Event(HIDDEN_EVENT));
    }

    destroy() {
        this.destroyed = true;
        this.root.remove();
    }
}
