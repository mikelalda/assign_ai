// Tests of local_assign_ai/review_with_ai: the "Review" and "Review all" buttons.
import {renderTemplate, flush} from '../helpers';

jest.mock('local_assign_ai/review_progress', () => ({ensurePolling: jest.fn()}));

let Ajax;
let Notification;
let Str;
let progress;

const ROWS = [
    {
        userid: 11, cmid: 5, courseid: 2, pendingid: 0, fullname: 'Ane', aistatus: 'initial',
        statebadge: 'Not reviewed', statebadgeclass: 'badge bg-secondary', statehint: '',
    },
    {
        userid: 12, cmid: 5, courseid: 2, pendingid: 31, fullname: 'Jon', aistatus: 'pending', ispending: true,
        canapproveai: true, statebadge: 'Pending', statebadgeclass: 'badge bg-info', statehint: '',
    },
];

const reviewAll = () => document.querySelector('.js-review-all');
const reviewOne = () => document.querySelector('tr[data-userid="11"] .js-btn-review');
const processCalls = () => Ajax.callsTo('local_assign_ai_process_submission');

/**
 * Click a button and let the request finish.
 *
 * @param {Element} button
 */
const click = async(button) => {
    button.click();
    await flush();
};

beforeEach(async() => {
    jest.resetModules();
    document.body.innerHTML = renderTemplate('local_assign_ai/review_page', {
        cmid: 5, courseid: 2, hasinitial: true, haspending: true, rows: ROWS,
    });
    Ajax = require('core/ajax');
    Notification = require('core/notification').default;
    Str = require('core/str');
    progress = require('local_assign_ai/review_progress');
    await require('local_assign_ai/review_with_ai').init();
});

describe('review with AI', () => {
    it('reviews one submission and reports how many were processed', async() => {
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'ok', processed: 1}});

        await click(reviewOne());

        expect(processCalls()).toEqual([{cmid: 5, userid: 11, all: false, pendingid: 0}]);
        expect(Notification.saveCancelPromise).not.toHaveBeenCalled();
        expect(Notification.addNotification).toHaveBeenCalledWith({message: '[processed] [reloadpage]', type: 'success'});
    });

    it('shows a spinner and disables the button while the request runs', async() => {
        let answer;
        Ajax.setResponses({'local_assign_ai_process_submission': () => new Promise((resolve) => {
            answer = resolve;
        })});

        reviewOne().click();
        await flush();
        expect(reviewOne().disabled).toBe(true);
        expect(reviewOne().querySelector('.spinner-border')).not.toBeNull();

        answer({status: 'none'});
        await flush();
        expect(reviewOne().disabled).toBe(false);
        expect(reviewOne().querySelector('.spinner-border')).toBeNull();
    });

    it('asks before reviewing everything and does nothing when cancelled', async() => {
        Notification.saveCancelPromise.mockReturnValueOnce(Promise.reject(new Error('Cancelled')));
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'ok', processed: 2}});

        await click(reviewAll());

        expect(Notification.saveCancelPromise).toHaveBeenCalledWith(
            '[confirm]', '[confirm_review_all]', '[continue]', {triggerElement: reviewAll()});
        expect(processCalls()).toEqual([]);
        expect(reviewAll().disabled).toBe(false);
    });

    it('marks every row as queued and starts following the progress after "Review all"', async() => {
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'queued'}});

        await click(reviewAll());

        expect(processCalls()).toEqual([{cmid: 5, userid: 0, all: true, pendingid: 0}]);
        expect(Notification.addNotification).toHaveBeenCalledWith({message: '[aistatus_queued_short]', type: 'info'});
        expect(reviewAll().disabled).toBe(true);
        expect(document.body.classList.contains('assign-ai-progress-running')).toBe(true);
        document.querySelectorAll('tr[data-cmid="5"]').forEach((row) => {
            expect(row.dataset.status).toBe('queued');
            expect(row.classList.contains('js-row-queued')).toBe(true);
            expect(row.querySelector('.js-state-badge').className).toBe('badge bg-warning text-dark js-state-badge');
            expect(row.querySelector('.js-state-badge').textContent).toBe('[aistatus_queued_short]');
            expect(row.querySelector('.js-state-hint').textContent).toBe('[aistatus_queued_help]');
            row.querySelectorAll('button').forEach((button) => expect(button.disabled).toBe(true));
            expect(row.querySelector('.js-btn-details').classList.contains('d-none')).toBe(true);
        });
        expect(progress.ensurePolling).toHaveBeenCalledTimes(1);
    });

    it('reports a hint that cannot be loaded instead of ignoring it', async() => {
        const failure = new Error('String not found');
        Str.get_string.mockImplementation(async(key) => {
            if (key === 'aistatus_queued_help') {
                throw failure;
            }
            return `[${key}]`;
        });
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'queued'}});

        await click(reviewAll());

        expect(Notification.exception).toHaveBeenCalledWith(failure);
        expect(progress.ensurePolling).toHaveBeenCalledTimes(1);
    });

    it('gives the button back when one queued submission is accepted', async() => {
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'queued'}});

        await click(reviewOne());

        expect(reviewOne().disabled).toBe(false);
        expect(progress.ensurePolling).not.toHaveBeenCalled();
    });

    it('warns when there was nothing to review', async() => {
        Ajax.setResponses({'local_assign_ai_process_submission': {status: 'nothing'}});

        await click(reviewOne());

        expect(Notification.addNotification).toHaveBeenCalledWith({message: '[nosubmissions]', type: 'warning'});
        expect(reviewOne().disabled).toBe(false);
    });

    it('reports a failed request and gives the button back', async() => {
        const failure = new Error('Server error');
        Ajax.setResponses({'local_assign_ai_process_submission': () => {
            throw failure;
        }});
        const label = reviewOne().innerHTML;

        await click(reviewOne());

        expect(Notification.addNotification).toHaveBeenCalledWith({message: '[processingerror]', type: 'error'});
        expect(Notification.exception).toHaveBeenCalledWith(failure);
        expect(reviewOne().innerHTML).toBe(label);
        expect(reviewOne().disabled).toBe(false);
    });
});
