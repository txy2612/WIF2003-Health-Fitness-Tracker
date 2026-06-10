import request from 'supertest';
import app from '../../src/app.js';
import { connectDB, clearDB, closeDB } from '../db.js';

// Setup and Teardown Hooks
beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Profile API', () => {
    let token;

    beforeEach(async () => {
        await request(app).post('/api/v1/auth/register').send({
            name: "Profile Tester",
            email: "profile@test.com",
            password: "ValidPassword123!"
        });

        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: "profile@test.com",
            password: "ValidPassword123!"
        });

        token = loginRes.body.data.token;
    });

    describe('GET /api/v1/profile', () => {

        test('Should fetch the profile for an authenticated user', async () => {
            const res = await request(app)
                .get('/api/v1/profile')
                .set('Authorization', `Bearer ${token}`); // set token

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data.user.email).toBe("profile@test.com");
        });

        test('Should block access if no token is provided', async () => {
            const res = await request(app)
                .get('/api/v1/profile');

            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('message');
        });
    });

    describe('PUT /api/v1/profile', () => {

        test('Should successfully update the user profile', async () => {
            const res = await request(app)
                .put('/api/v1/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    goal: "endurance",
                    height: 175,
                    weight: 70
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data.user.goal).toBe("endurance");
        });
    });

    describe('POST /api/v1/profile/photo', () => {
        test('Should successfully upload a profile photo', async () => {
            //Create a fake image file in memory
            const fakeImageBuffer = Buffer.from('fake image data');

            const res = await request(app)
                .post('/api/v1/profile/photo')
                .set('Authorization', `Bearer ${token}`)
                .attach('photo', fakeImageBuffer, 'test-profile.jpg');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.photo).toBeDefined();
            expect(typeof res.body.data.photo).toBe('string');
        });
    });

    describe('PUT /api/v1/profile/goals', () => {
        test('Should successfully update user goals', async () => {
            const res = await request(app)
                .put('/api/v1/profile/goals')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    steps: 10000,
                    calories: 2500,
                    weight: 70
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data.steps).toBe(10000);
            expect(res.body.data.calories).toBe(2500);
            expect(res.body.data.weight).toBe(70);
        });

        test('Should reject goal updates with invalid data types', async () => {
            const res = await request(app)
                .put('/api/v1/profile/goals')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    steps: "ten thousand"
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('detail');
        });
    });

    describe('DELETE /api/v1/profile/goals', () => {
        test('Should successfully delete or reset user goals', async () => {
            const res = await request(app)
                .delete('/api/v1/profile/goals')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('PUT /api/v1/profile/change-password', () => {
        test('Should successfully change password with correct current password', async () => {
            const res = await request(app)
                .put('/api/v1/profile/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: "ValidPassword123!",
                    newPassword: "NewStrongPassword456!"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('Should reject password change with incorrect current password', async () => {
            const res = await request(app)
                .put('/api/v1/profile/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: "WrongOldPassword!",
                    newPassword: "NewStrongPassword456!"
                });
            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('detail');
        });
    });

    describe('DELETE /api/v1/profile', () => {
        test('Should successfully delete the user account', async () => {
            const res = await request(app)
                .delete('/api/v1/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            //Try to fetch the profile again using the same token
            const fetchRes = await request(app)
                .get('/api/v1/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(fetchRes.statusCode).not.toBe(200);
        });
    });
});