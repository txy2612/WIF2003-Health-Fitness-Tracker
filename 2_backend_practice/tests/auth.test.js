import request from 'supertest';
import app from '../src/app.js';
import { connectDB, clearDB, closeDB } from './db.js';
import User from '../src/modules/profile/profileModel.js';

// Setup and Teardown Hooks
beforeAll(async () => await connectDB());    // Start fake DB before tests
afterEach(async () => await clearDB());      // Wipe data between tests
afterAll(async () => await closeDB());       // Shut down DB when done

describe('Authentication API', () => {

    describe('POST /api/v1/auth/register', () => {

        test('Should successfully register a new user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: "Test User",
                    email: "test@test.com",
                    password: "Password123!"
                });

            //Check if the API responded correctly
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);

            //Verify the user actually saved to the database
            const userInDb = await User.findOne({ email: "test@test.com" });
            expect(userInDb).toBeTruthy();
            expect(userInDb.name).toBe("Test User");

            //The password should be hashed!
            expect(userInDb.password).not.toBe("Password123!");
        });

        test('Should reject registration with a short password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: "Test User",
                    email: "test@test.com",
                    password: "short"
                });

            //Assuming Zod catches this and returns a 400 Bad Request
            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {

        //Create a test user before trying to log them in
        beforeEach(async () => {
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: "Login Test User",
                    email: "logintest@test.com",
                    password: "ValidPassword123!"
                });
        });

        test('Should successfully log in and return a JWT token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: "logintest@test.com",
                    password: "ValidPassword123!"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            //Look inside the 'data' object token
            expect(res.body.data).toHaveProperty('token');
            expect(typeof res.body.data.token).toBe('string');
        });

        test('Should reject login with incorrect password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: "logintest@test.com",
                    password: "WrongPassword!"
                });

            expect(res.statusCode).not.toBe(200);
            expect(res.body).toHaveProperty('detail');
        });

        test('Should reject login for non-existent email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: "nobody@test.com",
                    password: "ValidPassword123!"
                });

            expect(res.statusCode).not.toBe(200);
            expect(res.body).toHaveProperty('detail');
        });
    });

});