// Fake of core/modal (see fakemodal.js). Modal.instances lists every modal created.
import {FakeModal} from '../fakemodal';

const Modal = {
    instances: [],
    create: jest.fn(async(config) => {
        const modal = new FakeModal(config);
        Modal.instances.push(modal);
        return modal;
    }),
};

export default Modal;
