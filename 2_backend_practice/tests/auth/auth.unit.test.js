import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import env from '../../src/config/env.js'
import authService from '../../src/modules/auth/authService.js'
import profileModel from '../../src/modules/profile/profileModel.js'

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  await profileModel.syncIndexes()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await profileModel.deleteMany({})
})

describe('Auth Unit Tests', () => {
  test('registerUser creates a profile with a hashed password and returns a token', async () => {
    const result = await authService.registerUser({
      name: 'Auth User',
      email: 'auth@example.com',
      password: 'ValidPassword123!',
      age: 25,
      gender: 'female',
      weight: 60,
      height: 165,
      goal: 'maintain',
    })

    expect(typeof result.token).toBe('string')

    const savedUser = await profileModel.findOne({ email: 'auth@example.com' }).lean()

    expect(savedUser).toBeTruthy()
    expect(savedUser.name).toBe('Auth User')
    expect(savedUser.password).not.toBe('ValidPassword123!')
    expect(await bcrypt.compare('ValidPassword123!', savedUser.password)).toBe(true)

    const decoded = jwt.verify(result.token, env.JWT_SECRET)
    expect(String(decoded.id)).toBe(String(savedUser._id))
  })

  test('registerUser rejects duplicate email addresses', async () => {
    await profileModel.create({
      name: 'Existing User',
      email: 'duplicate@example.com',
      password: 'hashed-password',
    })

    await expect(
      authService.registerUser({
        name: 'Duplicate User',
        email: 'duplicate@example.com',
        password: 'ValidPassword123!',
      })
    ).rejects.toMatchObject({
      message: 'Email is already registered',
      statusCode: 409,
    })
  })

  test('loginUser returns a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('ValidPassword123!', 10)

    const user = await profileModel.create({
      name: 'Login User',
      email: 'login@example.com',
      password: passwordHash,
    })

    const result = await authService.loginUser('login@example.com', 'ValidPassword123!')

    expect(typeof result.token).toBe('string')

    const decoded = jwt.verify(result.token, env.JWT_SECRET)
    expect(String(decoded.id)).toBe(String(user._id))
  })

  test('loginUser rejects unknown email addresses', async () => {
    await expect(
      authService.loginUser('missing@example.com', 'ValidPassword123!')
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    })
  })

  test('loginUser rejects invalid passwords', async () => {
    const passwordHash = await bcrypt.hash('ValidPassword123!', 10)

    await profileModel.create({
      name: 'Wrong Password User',
      email: 'wrongpass@example.com',
      password: passwordHash,
    })

    await expect(
      authService.loginUser('wrongpass@example.com', 'WrongPassword456!')
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    })
  })
})
