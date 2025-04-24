import { title } from 'process';
import { Event, EventRequest } from '../../src/models/Event';

export const ORGID = '123';
export const INVALID_ORGID = 'invalid';

export let validEventRequest: EventRequest = {
    title: 'New Event',
    description: 'Event description',
    date: '2025-04-15',
};

export let invalidEvent: EventRequest = {
    title: '',
    description: '',
    date: '',
};

export let createdEvent: Event = {
    PK: 'EVENT#mock-uuid',
    SK: 'ENTITY',
    id: 'mock-uuid',
    title: 'Test Event',
    description: 'This is a test event',
    isPublic: true,
    date: '2025-04-02T21:26:21.561Z',
    createdAt: '2025-04-02T21:26:21.561Z',
    updatedAt: '2025-04-02T21:26:21.561Z',
    GSI2PK: 'ORG#123',
    GSI2SK: 'EVENT#mock-uuid',
};

export let createdEventRequest: Event = {
    PK: 'EVENT#mock-uuid',
    SK: 'ENTITY',
    id: 'mock-uuid',
    title: 'New Event',
    isPublic: true,
    description: 'Event description',
    date: '2025-04-02T21:26:21.561Z',
    createdAt: '2025-04-02T21:26:21.561Z',
    updatedAt: '2025-04-02T21:26:21.561Z',
    GSI2PK: 'ORG#123',
    GSI2SK: 'EVENT#mock-uuid',
};
