import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import progressChartsModel from '../../src/modules/progress-charts/progressChartsModel.js';
import profileModel from '../../src/modules/profile/profileModel.js';

let mongoServer;

//Helper function to get dates in YYYY-MM-DD format
const getFormattedDate = (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Progress Charts Module E2E Lifecycle', () => {

    test('Complete Time-Series Data & Aggregation Journey', async () => {

        const user1 = { name: "Chart User", email: "chart1@test.com", password: "Password123!" };
        const user2 = { name: "Other User", email: "chart2@test.com", password: "Password123!" };

        let token1;
        let token2;

        const todayStr = getFormattedDate(0);
        const yesterdayStr = getFormattedDate(-1);

        //Register & Login User 1
        await request(app).post('/api/v1/auth/register').send(user1);
        const loginRes1 = await request(app).post('/api/v1/auth/login').send({ email: user1.email, password: user1.password });
        token1 = loginRes1.body.data.token;

        //Register & Login User 2 (For testing data isolation)
        await request(app).post('/api/v1/auth/register').send(user2);
        const loginRes2 = await request(app).post('/api/v1/auth/login').send({ email: user2.email, password: user2.password });
        token2 = loginRes2.body.data.token;

        //Log water for today (User 1)
        const postWaterTodayRes = await request(app)
            .post('/api/v1/progress-charts/water')
            .set('Authorization', `Bearer ${token1}`)
            .send({ date: todayStr, glasses: 5 });
        expect(postWaterTodayRes.status).toBe(200);

        //Log water for yesterday (User 1)
        const postWaterYesterdayRes = await request(app)
            .post('/api/v1/progress-charts/water')
            .set('Authorization', `Bearer ${token1}`)
            .send({ date: yesterdayStr, glasses: 8 });
        expect(postWaterYesterdayRes.status).toBe(200);

        //Fetch today's water to verify ingestion
        const getWaterTodayRes = await request(app)
            .get(`/api/v1/progress-charts/water?date=${todayStr}`)
            .set('Authorization', `Bearer ${token1}`);
        expect(getWaterTodayRes.status).toBe(200);
        expect(JSON.stringify(getWaterTodayRes.body)).toContain('5');

        //Update today's water to 10
        const updateWaterTodayRes = await request(app)
            .post('/api/v1/progress-charts/water')
            .set('Authorization', `Bearer ${token1}`)
            .send({ date: todayStr, glasses: 10 });
        expect(updateWaterTodayRes.status).toBe(200);

        //Verify the database only has 2 entries total for User 1, not 3 (upsert worked)
        const dbEntriesCount = await progressChartsModel.countDocuments();
        expect(dbEntriesCount).toBe(2);

        //Fetch Overview
        const overviewRes = await request(app)
            .get('/api/v1/progress-charts')
            .set('Authorization', `Bearer ${token1}`);
        expect(overviewRes.status).toBe(200);

        //Fetch Weekly Data (Offset 0 = Current Week)
        const weeklyRes = await request(app)
            .get('/api/v1/progress-charts/weekly?offset=0')
            .set('Authorization', `Bearer ${token1}`);
        expect(weeklyRes.status).toBe(200);

        //Fetch Monthly Data (Offset 0 = Current Month)
        const monthlyRes = await request(app)
            .get('/api/v1/progress-charts/monthly?offset=0')
            .set('Authorization', `Bearer ${token1}`);
        expect(monthlyRes.status).toBe(200);

        //Fetch Range Preview (Provide a generic valid query string)
        const rangeRes = await request(app)
            .get('/api/v1/progress-charts/range-preview?query=water')
            .set('Authorization', `Bearer ${token1}`);
        expect(rangeRes.status).toBe(200);

        //User 2 tries to fetch today's water. It should be 0, completely isolated from User 1's 10 glasses.
        const user2WaterRes = await request(app)
            .get(`/api/v1/progress-charts/water?date=${todayStr}`)
            .set('Authorization', `Bearer ${token2}`);
        expect(user2WaterRes.status).toBe(200);
        //Ensure that user2 water doesnot contain user1 glassess=10
        expect(JSON.stringify(user2WaterRes.body.glasses)).not.toContain('10');
    });
});