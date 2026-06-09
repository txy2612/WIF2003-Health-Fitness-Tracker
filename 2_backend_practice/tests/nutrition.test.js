import request from 'supertest';
import app from '../src/app.js';
import { connectDB, clearDB, closeDB } from './db.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Nutrition Planner API', () => {
    let token;

    beforeEach(async () => {
        await request(app).post('/api/v1/auth/register').send({
            name: "Nutrition Tester",
            email: "nutrition@test.com",
            password: "ValidPassword123!"
        });

        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: "nutrition@test.com",
            password: "ValidPassword123!"
        });

        token = loginRes.body.data.token;
    });

    describe('GET /api/v1/nutrition-planner/', () => {
        test('Should successfully fetch the nutrition overview catalogue', async () => {
            const res = await request(app).get('/api/v1/nutrition-planner/');

            expect(res.statusCode).toBe(200);
        });
    });

    describe('POST /api/v1/nutrition-planner/calorie-goal', () => {
        test('Should calculate calorie goal with valid data', async () => {
            const res = await request(app)
                .post('/api/v1/nutrition-planner/calorie-goal')
                .send({
                    age: 25,
                    gender: "male",
                    heightCm: 180,
                    weightKg: 75,
                    activityMultiplier: 1.5,
                    goal: "maintain"
                });

            expect(res.statusCode).toBe(201);
        });

        test('Should reject invalid biometric data (Zod Validation)', async () => {
            const res = await request(app)
                .post('/api/v1/nutrition-planner/calorie-goal')
                .send({
                    age: 5, // Invalid: min is 13
                    gender: "alien", // Invalid enum
                    heightCm: 180,
                    weightKg: 75,
                    activityMultiplier: 1.5,
                    goal: "maintain"
                });

            expect(res.statusCode).toBe(400); // Bad Request
        });
    });

    describe('GET /api/v1/nutrition-planner/favourites', () => {
        test('Should successfully fetch favourites for authenticated user', async () => {
            const res = await request(app)
                .get('/api/v1/nutrition-planner/favourites')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
        });

        test('Should block unauthorized requests to favourites', async () => {
            const res = await request(app).get('/api/v1/nutrition-planner/favourites'); // No token

            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/v1/nutrition-planner/favourites', () => {
        test('Should allow authenticated user to add a favourite meal', async () => {
            const res = await request(app)
                .post('/api/v1/nutrition-planner/favourites')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    mealId: "meal-123",
                    name: "Chicken Salad",
                    calories: 450
                });

            expect(res.statusCode).toBe(201);
        });
    });

    describe('DELETE /api/v1/nutrition-planner/favourites/:mealId', () => {
        test('Should allow authenticated user to delete a favourite', async () => {
            //Create it first
            await request(app)
                .post('/api/v1/nutrition-planner/favourites')
                .set('Authorization', `Bearer ${token}`)
                .send({ mealId: "meal-999", name: "Apple", calories: 95 });

            //Delete it using the mealId parameter
            const res = await request(app)
                .delete('/api/v1/nutrition-planner/favourites/meal-999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
        });
    });

    describe('GET /api/v1/nutrition-planner/plan', () => {
        test('Should reject requests missing the date query', async () => {
            const res = await request(app)
                .get('/api/v1/nutrition-planner/plan') // Missing date
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('date query param required');
        });

        test('Should successfully fetch plan with valid date query', async () => {
            const res = await request(app)
                .get('/api/v1/nutrition-planner/plan?date=2026-05-12')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
        });
    });

    describe('PUT /api/v1/nutrition-planner/plan', () => {
        test('Should successfully save a daily plan', async () => {
            const res = await request(app)
                .put('/api/v1/nutrition-planner/plan')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    date: "2026-05-12",
                    breakfast: [{ id: "b1", name: "Oatmeal", calories: 300 }],
                    lunch: [],
                    dinner: []
                });

            expect(res.statusCode).toBe(200);
        });
    });
});