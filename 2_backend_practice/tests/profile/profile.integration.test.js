import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import profileModel from '../../src/modules/profile/profileModel.js';

let mongoServer;

beforeAll(async () => {
    // 1. Spin up the isolated test database
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    // 2. Shut down and clean up after the lifecycle completes
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Profile Module End-to-End Lifecycle', () => {

    test('Complete Profile Management Lifecycle', async () => {

        const credentials = {
            name: "Lifecycle Tester",
            email: "journey@test.com",
            password: "InitialPassword123!"
        };
        let token;

        //Register the user
        await request(app).post('/api/v1/auth/register').send(credentials);

        //Login to grab (JWT)
        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: credentials.email,
            password: credentials.password
        });
        token = loginRes.body.data.token;
        expect(token).toBeDefined();

        //Fetch the initial empty profile
        const initialProfileRes = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(initialProfileRes.status).toBe(200);

        //Update personal details
        const updateProfileRes = await request(app)
            .put('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ height: 180, weight: 75 });
        expect(updateProfileRes.status).toBe(200);

        //Set fitness goals
        const updateGoalsRes = await request(app)
            .put('/api/v1/profile/goals')
            .set('Authorization', `Bearer ${token}`)
            .send({ steps: 12000, calories: 2500, water: 8 });
        expect(updateGoalsRes.status).toBe(200);

        //Upload a profile photo
        const fakeImageBuffer = Buffer.from('simulated image data');
        const photoUploadRes = await request(app)
            .post('/api/v1/profile/photo')
            .set('Authorization', `Bearer ${token}`)
            .attach('photo', fakeImageBuffer, 'avatar.jpg');
        expect(photoUploadRes.status).toBe(200);
        expect(photoUploadRes.body.data.photo).toBeDefined();

        //Change the password
        const newPassword = "NewJourneyPassword456!";
        const passwordChangeRes = await request(app)
            .put('/api/v1/profile/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
                currentPassword: credentials.password,
                newPassword: newPassword
            });
        expect(passwordChangeRes.status).toBe(200);

        //Verify the old password is now rejected
        const failedLoginRes = await request(app).post('/api/v1/auth/login').send({
            email: credentials.email,
            password: credentials.password
        });
        expect(failedLoginRes.status).toBe(401);

        //Delete fitness goals
        const deleteGoalsRes = await request(app)
            .delete('/api/v1/profile/goals')
            .set('Authorization', `Bearer ${token}`);
        expect(deleteGoalsRes.status).toBe(200);

        //Delete the account entirely
        const deleteAccountRes = await request(app)
            .delete('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(deleteAccountRes.status).toBe(200);

        //Attempt to fetch the deleted profile
        const ghostProfileRes = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(ghostProfileRes.status).not.toBe(200); // Should 404
    });
});