// Tests of local_assign_ai/review: the review modal and "Approve all".
import {renderTemplate, flush} from '../helpers';

let Ajax;
let Notification;
let ModalFactory;
let loader;

const ROWS = [{
    userid: 12, cmid: 5, courseid: 2, pendingid: 31, fullname: 'Jon', aistatus: 'pending', ispending: true,
    canapproveai: true, statebadge: 'Pending', statebadgeclass: 'badge bg-info',
}];
const MESSAGE = '<p>Good work &amp; well argued.</p>';

const approveAll = () => document.querySelector('.js-approve-all');
const details = () => document.querySelector('.view-details');
const modal = () => ModalFactory.instances[ModalFactory.instances.length - 1];
const inModal = (selector) => modal().root.querySelector(selector);

/**
 * A TinyMCE that keeps one editor per textarea.
 *
 * @returns {object}
 */
const fakeTinyMCE = () => {
    const editors = {};
    return {
        editors,
        init: jest.fn(async({target}) => {
            editors[target.id] = {
                content: target.value,
                getContent() {
                    return this.content;
                },
                remove: jest.fn(),
            };
        }),
        get: (id) => editors[id],
    };
};

/**
 * Open the details of the submission and wait for the modal.
 */
const openDetails = async() => {
    details().click();
    await flush();
};

beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = renderTemplate('local_assign_ai/review_page', {
        cmid: 5, courseid: 2, hasinitial: true, haspending: true, rows: ROWS,
    });
    Ajax = require('core/ajax');
    Notification = require('core/notification').default;
    ModalFactory = require('core/modal_factory').default;
    ModalFactory.instances = [];
    loader = require('editor_tiny/loader');
    Ajax.setResponses({
        'local_assign_ai_get_details': {message: MESSAGE},
        'local_assign_ai_update_response': {status: 'ok'},
        'local_assign_ai_change_status': {status: 'ok'},
        'local_assign_ai_approve_all_pending': {status: 'ok'},
    });
    require('local_assign_ai/review').init();
});

describe('approve all', () => {
    it('approves every pending review of the activity after confirming', async() => {
        approveAll().click();
        await flush();

        expect(Notification.saveCancelPromise).toHaveBeenCalledWith(
            '[confirm]', '[confirm_approve_all]', '[continue]', {triggerElement: approveAll()});
        expect(Ajax.callsTo('local_assign_ai_approve_all_pending')).toEqual([{courseid: 2, cmid: 5}]);
        expect(approveAll().disabled).toBe(true);
        expect(approveAll().querySelector('.spinner-border')).not.toBeNull();
    });

    it('does nothing when cancelled', async() => {
        Notification.saveCancelPromise.mockReturnValueOnce(Promise.reject(new Error('Cancelled')));

        approveAll().click();
        await flush();

        expect(Ajax.callsTo('local_assign_ai_approve_all_pending')).toEqual([]);
        expect(approveAll().disabled).toBe(false);
    });

    it('reports a failure and gives the button back', async() => {
        const failure = new Error('Server error');
        Ajax.setResponses({'local_assign_ai_approve_all_pending': () => {
            throw failure;
        }});
        const label = approveAll().innerHTML;

        approveAll().click();
        await flush();

        expect(Notification.exception).toHaveBeenCalledWith(failure);
        expect(approveAll().innerHTML).toBe(label);
        expect(approveAll().disabled).toBe(false);
    });
});

describe('review modal', () => {
    it('shows the AI response of the student', async() => {
        await openDetails();

        expect(Ajax.callsTo('local_assign_ai_get_details')).toEqual([{courseid: 2, cmid: 5, userid: 12}]);
        expect(modal().shown).toBe(true);
        expect(modal().root.querySelector('.modal-title').textContent).toBe('[modaltitle]');
        expect(inModal('#airesponse-edit').value).toBe(MESSAGE);
    });

    it('keeps markup in the response inside the editor', async() => {
        const hostile = '</textarea><img src="x" onerror="window.hacked = true">';
        Ajax.setResponses({'local_assign_ai_get_details': {message: hostile}});

        await openDetails();

        expect(inModal('#airesponse-edit').value).toBe(hostile);
        expect(inModal('img')).toBeNull();
    });

    it('saves the text area when TinyMCE is not available', async() => {
        await openDetails();
        inModal('#airesponse-edit').value = 'Edited by the teacher';

        inModal('.save-ai').click();
        await flush();

        expect(Ajax.callsTo('local_assign_ai_update_response')).toEqual([
            {courseid: 2, cmid: 5, userid: 12, message: 'Edited by the teacher'},
        ]);
        expect(Ajax.callsTo('local_assign_ai_change_status')).toEqual([]);
    });

    it('saves what TinyMCE holds, then approves', async() => {
        const tinymce = fakeTinyMCE();
        loader.getTinyMCE.mockResolvedValueOnce(tinymce);
        await openDetails();
        tinymce.get('airesponse-edit').content = '<p>Approved text</p>';

        inModal('.approve-ai').click();
        await flush();

        expect(tinymce.init).toHaveBeenCalledWith(expect.objectContaining({target: inModal('#airesponse-edit')}));
        expect(Ajax.callsTo('local_assign_ai_update_response')).toEqual([
            {courseid: 2, cmid: 5, userid: 12, message: '<p>Approved text</p>'},
        ]);
        expect(Ajax.callsTo('local_assign_ai_change_status')).toEqual([{courseid: 2, cmid: 5, userid: 12, action: 'approve'}]);
    });

    it('does not approve when saving fails', async() => {
        const failure = new Error('Cannot save');
        Ajax.setResponses({'local_assign_ai_get_details': {message: MESSAGE}, 'local_assign_ai_update_response': () => {
            throw failure;
        }});
        await openDetails();

        inModal('.approve-ai').click();
        await flush();

        expect(Notification.exception).toHaveBeenCalledWith(failure);
        expect(Ajax.callsTo('local_assign_ai_change_status')).toEqual([]);
    });

    it('removes the TinyMCE editor when the modal closes', async() => {
        const tinymce = fakeTinyMCE();
        loader.getTinyMCE.mockResolvedValueOnce(tinymce);
        await openDetails();

        modal().hide();

        expect(tinymce.get('airesponse-edit').remove).toHaveBeenCalledTimes(1);
    });

    it('closes cleanly without TinyMCE', async() => {
        await openDetails();

        expect(() => modal().hide()).not.toThrow();
    });

    it('reports details that cannot be loaded', async() => {
        const failure = new Error('No details');
        Ajax.setResponses({'local_assign_ai_get_details': () => {
            throw failure;
        }});

        await openDetails();

        expect(Notification.exception).toHaveBeenCalledWith(failure);
        expect(ModalFactory.instances).toHaveLength(0);
    });
});
