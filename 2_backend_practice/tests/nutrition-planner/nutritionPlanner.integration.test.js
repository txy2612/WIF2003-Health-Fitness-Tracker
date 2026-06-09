import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../../src/app.js'
import env from '../../src/config/env.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import nutritionPlannerModel from '../../src/modules/nutrition-planner/nutritionPlannerModel.js'
import favouriteModel from '../../src/modules/nutrition-planner/favouriteModel.js'
import mealPlanModel from '../../src/modules/nutrition-planner/mealPlanModel.js'
import progressChartsModel from '../../src/modules/progress-charts/progressChartsModel.js'

let mongoServer
let user
let otherUser
let token
let otherToken

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  await favouriteModel.syncIndexes()
  await mealPlanModel.syncIndexes()
  await progressChartsModel.syncIndexes()

  user = await profileModel.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'password123',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
  otherToken = jwt.sign({ id: otherUser._id }, env.JWT_SECRET)
})

afterEach(async () => {
  await nutritionPlannerModel.deleteMany({})
  await favouriteModel.deleteMany({})
  await mealPlanModel.deleteMany({})
  await progressChartsModel.deleteMany({})
})

afterAll(async () => {
  await profileModel.deleteMany({})
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('Nutrition Planner Integration Tests', () => {
  test('GET /api/v1/nutrition-planner should return meal catalogue and plan preview', async () => {
    await nutritionPlannerModel.create([
      {
        name: 'Grilled Chicken',
        calories: 320,
        proteinGrams: 35,
        carbsGrams: 8,
        fatGrams: 10,
        tags: ['protein'],
      },
      {
        name: 'Salmon Bowl',
        calories: 410,
        proteinGrams: 28,
        carbsGrams: 20,
        fatGrams: 18,
        tags: ['omega'],
      },
    ])

    const response = await request(app).get('/api/v1/nutrition-planner')

    expect(response.status).toBe(200)
    expect(response.body.meals).toHaveLength(2)
    expect(response.body.plan.plannedMeals).toHaveLength(2)
  })

  test('GET /api/v1/nutrition-planner should filter meals by search query', async () => {
    await nutritionPlannerModel.create([
      {
        name: 'Grilled Chicken',
        calories: 320,
        proteinGrams: 35,
        carbsGrams: 8,
        fatGrams: 10,
        tags: ['protein'],
      },
      {
        name: 'Berry Oats',
        calories: 250,
        proteinGrams: 10,
        carbsGrams: 40,
        fatGrams: 5,
        tags: ['breakfast'],
      },
    ])

    const response = await request(app).get('/api/v1/nutrition-planner?search=chicken')

    expect(response.status).toBe(200)
    expect(response.body.meals).toHaveLength(1)
    expect(response.body.meals[0].name).toBe('Grilled Chicken')
  })

  test('POST /api/v1/nutrition-planner/calorie-goal should calculate calorie target', async () => {
    const response = await request(app)
      .post('/api/v1/nutrition-planner/calorie-goal')
      .send({
        age: 25,
        gender: 'male',
        heightCm: 175,
        weightKg: 70,
        activityMultiplier: 1.55,
        goal: 'maintain',
      })

    expect(response.status).toBe(201)
    expect(response.body.maintenanceCalories).toBeDefined()
    expect(response.body.targetCalories).toBeDefined()
    expect(response.body.proteinGrams).toBeDefined()
  })

  test('POST /api/v1/nutrition-planner/calorie-goal should reject invalid payload', async () => {
    const response = await request(app)
      .post('/api/v1/nutrition-planner/calorie-goal')
      .send({
        age: 10,
        gender: 'unknown',
      })

    expect(response.status).toBe(400)
  })

  test('GET /api/v1/nutrition-planner/hydration should require auth', async () => {
    const response = await request(app).get('/api/v1/nutrition-planner/hydration')

    expect(response.status).toBe(401)
  })

  test('GET /api/v1/nutrition-planner/hydration should return current user water only', async () => {
    const today = todayStr()
    const startOfToday = new Date(`${today}T00:00:00.000`)

    await progressChartsModel.create([
      {
        userId: user._id,
        metric: 'waterGlasses',
        recordedFor: startOfToday,
        value: 6,
      },
      {
        userId: otherUser._id,
        metric: 'waterGlasses',
        recordedFor: startOfToday,
        value: 10,
      },
    ])

    const response = await request(app)
      .get(`/api/v1/nutrition-planner/hydration?date=${today}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ date: today, glasses: 6 })
  })

  test('GET /api/v1/nutrition-planner/favourites should return only current user favourites', async () => {
    await favouriteModel.create([
      {
        userId: user._id,
        mealId: 'meal-1',
        name: 'My Meal',
        calories: 300,
        img: '',
      },
      {
        userId: otherUser._id,
        mealId: 'meal-2',
        name: 'Other Meal',
        calories: 420,
        img: '',
      },
    ])

    const response = await request(app)
      .get('/api/v1/nutrition-planner/favourites')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.favourites).toHaveLength(1)
    expect(response.body.favourites[0].mealId).toBe('meal-1')
  })

  test('POST /api/v1/nutrition-planner/favourites should create favourite for logged-in user', async () => {
    const response = await request(app)
      .post('/api/v1/nutrition-planner/favourites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mealId: 'meal-1',
        name: 'Chicken Rice',
        calories: 380,
        img: 'img.png',
      })

    expect(response.status).toBe(201)
    expect(response.body.mealId).toBe('meal-1')

    const savedFavourite = await favouriteModel.findOne({
      userId: user._id,
      mealId: 'meal-1',
    }).lean()

    expect(savedFavourite).not.toBeNull()
    expect(savedFavourite.name).toBe('Chicken Rice')
  })

  test('POST /api/v1/nutrition-planner/favourites should reject invalid payload', async () => {
    const response = await request(app)
      .post('/api/v1/nutrition-planner/favourites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mealId: '',
        calories: -1,
      })

    expect(response.status).toBe(400)

    const count = await favouriteModel.countDocuments({})
    expect(count).toBe(0)
  })

  test('POST /api/v1/nutrition-planner/favourites should not duplicate existing favourite', async () => {
    await favouriteModel.create({
      userId: user._id,
      mealId: 'meal-1',
      name: 'Chicken Rice',
      calories: 380,
      img: '',
    })

    const response = await request(app)
      .post('/api/v1/nutrition-planner/favourites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mealId: 'meal-1',
        name: 'Chicken Rice',
        calories: 380,
        img: '',
      })

    expect(response.status).toBe(201)

    const favourites = await favouriteModel.find({ userId: user._id, mealId: 'meal-1' }).lean()
    expect(favourites).toHaveLength(1)
  })

  test('DELETE /api/v1/nutrition-planner/favourites/:mealId should delete only current user favourite', async () => {
    await favouriteModel.create({
      userId: user._id,
      mealId: 'meal-1',
      name: 'Chicken Rice',
      calories: 380,
      img: '',
    })

    const response = await request(app)
      .delete('/api/v1/nutrition-planner/favourites/meal-1')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Favourite removed successfully')

    const savedFavourite = await favouriteModel.findOne({ userId: user._id, mealId: 'meal-1' }).lean()
    expect(savedFavourite).toBeNull()
  })

  test('DELETE /api/v1/nutrition-planner/favourites/:mealId should return 404 for missing record', async () => {
    const response = await request(app)
      .delete('/api/v1/nutrition-planner/favourites/missing-meal')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Favourite not found')
  })

  test('GET /api/v1/nutrition-planner/plan should require valid date query', async () => {
    const response = await request(app)
      .get('/api/v1/nutrition-planner/plan')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('date query param required')
  })

  test('GET /api/v1/nutrition-planner/plan should return empty plan when none saved', async () => {
    const today = todayStr()

    const response = await request(app)
      .get(`/api/v1/nutrition-planner/plan?date=${today}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      date: today,
      breakfast: [],
      lunch: [],
      dinner: [],
    })
  })

  test('PUT /api/v1/nutrition-planner/plan should save and return current user meal plan', async () => {
    const today = todayStr()
    const payload = {
      date: today,
      breakfast: [{ id: 'meal-1', name: 'Oats', calories: 250, img: '' }],
      lunch: [{ id: 'meal-2', name: 'Chicken Rice', calories: 380, img: '' }],
      dinner: [],
    }

    const response = await request(app)
      .put('/api/v1/nutrition-planner/plan')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)

    expect(response.status).toBe(200)
    expect(response.body.date).toBe(today)
    expect(response.body.breakfast).toHaveLength(1)
    expect(response.body.lunch).toHaveLength(1)

    const savedPlan = await mealPlanModel.findOne({ userId: user._id, date: today }).lean()
    expect(savedPlan).not.toBeNull()
    expect(savedPlan.breakfast).toHaveLength(1)
    expect(savedPlan.lunch[0].name).toBe('Chicken Rice')
  })

  test('PUT /api/v1/nutrition-planner/plan should upsert and keep user isolation', async () => {
    const today = todayStr()

    await mealPlanModel.create({
      userId: otherUser._id,
      date: today,
      breakfast: [{ id: 'meal-x', name: 'Other User Meal', calories: 500, img: '' }],
      lunch: [],
      dinner: [],
    })

    await request(app)
      .put('/api/v1/nutrition-planner/plan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: today,
        breakfast: [],
        lunch: [],
        dinner: [{ id: 'meal-3', name: 'Soup', calories: 180, img: '' }],
      })

    const ownPlan = await mealPlanModel.findOne({ userId: user._id, date: today }).lean()
    const otherPlan = await mealPlanModel.findOne({ userId: otherUser._id, date: today }).lean()

    expect(ownPlan.dinner).toHaveLength(1)
    expect(otherPlan.breakfast[0].name).toBe('Other User Meal')
  })
})
