import request from 'supertest';
import app from '../src/app.js';
import { connectDB, clearDB, closeDB } from './db.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Progress Charts API', () => {
    let token;

    beforeEach(async () => {
        await request(app).post('/api/v1/auth/register').send({
            name: "Progress Tester",
            email: "progress@test.com",
            password: "ValidPassword123!"
        });
        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: "progress@test.com", password: "ValidPassword123!"
        });
        token = loginRes.body.data.token;
    });

    describe('GET /api/v1/progress-charts/', () => {
        test('Should successfully fetch overview for authenticated user', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });

        test('Should block unauthorized requests', async () => {
            const res = await request(app).get('/api/v1/progress-charts/');
            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/progress-charts/range-preview', () => {
        test('Should successfully fetch preview with valid enums', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/range-preview?range=last-30-days&metric=calories')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });

        test('Should reject invalid metric enum (Zod Validation)', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/range-preview?range=last-7-days&metric=sleep')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/v1/progress-charts/water', () => {
        test('Should successfully log water intake', async () => {
            const res = await request(app)
                .post('/api/v1/progress-charts/water')
                .set('Authorization', `Bearer ${token}`)
                .send({ date: "2026-05-12", glasses: 8 });
            expect(res.statusCode).toBe(200);
        });
    });

    describe('GET /api/v1/progress-charts/water', () => {
        test('Should successfully fetch water intake for a specific date', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/water?date=2026-05-12')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('GET /api/v1/progress-charts/weekly', () => {
        test('Should successfully fetch weekly chart with offset', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/weekly?offset=0')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('GET /api/v1/progress-charts/monthly', () => {
        test('Should successfully fetch monthly chart with offset', async () => {
            const res = await request(app)
                .get('/api/v1/progress-charts/monthly?offset=-1')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });
});