import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import profileModel from '../../src/modules/profile/profileModel.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    await profileModel.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Authentication Module Integration', () => {
    test('Should handle the full registration and login flow, and prevent duplicates', async () => {
        const credentials = {
            name: "Auth Flow User",
            email: "authflow@test.com",
            password: "StrongPassword123!"
        };

        //Register
        const registerRes = await request(app).post('/api/v1/auth/register').send(credentials);
        expect(registerRes.status).toBe(201);

        //Ensure Database blocks duplicate emails
        const duplicateRes = await request(app).post('/api/v1/auth/register').send(credentials);
        expect(duplicateRes.status).toBe(409);

        //Login and verify JWT integration
        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: credentials.email,
            password: credentials.password
        });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data.token).toBeDefined();
    });
});