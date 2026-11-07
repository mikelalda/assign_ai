// Fake of core/templates that renders the plugin's real templates (see helpers.js).
import {renderTemplate} from '../../helpers';

export default {
    render: jest.fn(async(name, context) => renderTemplate(name, context)),
    renderForPromise: jest.fn(async(name, context) => ({html: renderTemplate(name, context), js: ''})),
    replaceNodeContents: jest.fn((node, html) => {
        const element = node && node.jquery ? node[0] : node;
        element.innerHTML = html;
    }),
    runTemplateJS: jest.fn(),
};
