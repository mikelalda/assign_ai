// Fake of core/modal_factory (see fakemodal.js). ModalFactory.instances lists every modal created.
import {FakeModal} from '../fakemodal';

const ModalFactory = {
    types: {DEFAULT: 'DEFAULT'},
    instances: [],
    create: jest.fn(async(config) => {
        const modal = new FakeModal(config);
        ModalFactory.instances.push(modal);
        return modal;
    }),
};

export default ModalFactory;
