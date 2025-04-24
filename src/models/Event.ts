// src/models/Event.ts
import { v4 as uuidv4 } from 'uuid';
import { WeatherData } from '../services/weatherService';

export interface Event {
    PK: string; // EVENT#<ID>
    SK: string;

    id: string;
    title: string;
    description: string;
    isPublic: boolean;
    date: string;
    createdAt: string;
    updatedAt: string;

    // Location fields
    location?: {
        name?: string;
        latitude: number;
        longitude: number;
    };

    // Weather data
    weather?: WeatherData;

    // GSI attributes
    GSI2PK: string; // ORG#<ID>
    GSI2SK: string; // EVENT#<ID>
}

export interface EventRequest {
    title: string;
    description: string;
    date: string;
    location?: {
        name?: string;
        latitude: number;
        longitude: number;
    };
    // New field for address string during event creation
    address?: string;
}

export interface EventUpdateRequest {
    title?: string;
    description?: string;
    date?: string;
    location?: {
        name?: string;
        latitude: number;
        longitude: number;
    };
    address?: string;
}

export interface EventUser {
    PK: string; // USER#<ID>
    SK: string; // EVENT#<ID>

    id: string;

    // GSI attributes
    GSI2PK: string; // EVENT#<ID>
    GSI2SK: string; // USER#<ID>
}

export const createEvent = (orgID: string, eventRequest: EventRequest): Event => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const date = eventRequest.date || now;
    const eventId = `EVENT#${id}`;
    return {
        PK: eventId,
        SK: 'ENTITY',
        id: id,
        title: eventRequest.title,
        description: eventRequest.description,
        isPublic: true,
        date: date,
        createdAt: now,
        updatedAt: now,
        location: eventRequest.location,
        GSI2PK: `ORG#${orgID.toUpperCase()}`,
        GSI2SK: eventId,
    };
};

export const createEventUser = (userid: string, eventid: string): EventUser => {
    const userId = `USER#${userid}`;
    const eventId = `EVENT#${eventid}`;
    return {
        PK: userId,
        SK: eventId,
        id: eventid, // passed in eventid
        GSI2PK: eventId,
        GSI2SK: userId,
    };
};
