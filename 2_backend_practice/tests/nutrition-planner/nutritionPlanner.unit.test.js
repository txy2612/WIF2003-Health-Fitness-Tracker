import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { jest } from '@jest/globals'

import nutritionPlannerService from '../../src/modules/nutrition-planner/nutritionPlannerService.js'
import nutritionPlannerModel from '../../src/modules/nutrition-planner/nutritionPlannerModel.js'
import favouriteModel from '../../src/modules/nutrition-planner/favouriteModel.js'
import mealPlanModel from '../../src/modules/nutrition-planner/mealPlanModel.js'
import progressChartsService from '../../src/modules/progress-charts/progressChartsService.js'

let mongoServer
let userId

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  await favouriteModel.syncIndexes()
  await mealPlanModel.syncIndexes()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  jest.restoreAllMocks()
  await nutritionPlannerModel.deleteMany({})
  await favouriteModel.deleteMany({})
  await mealPlanModel.deleteMany({})
  userId = new mongoose.Types.ObjectId()
})

describe('Nutrition Planner Unit Tests', () => {
  test('getNutritionPlannerOverview returns sorted meals and a top-three plan preview', async () => {
    await nutritionPlannerModel.create([
      {
        name: 'Chicken Salad',
        calories: 420,
        proteinGrams: 35,
        carbsGrams: 20,
        fatGrams: 18,
        tags: ['high-protein'],
      },
      {
        name: 'Avocado Toast',
        calories: 320,
        proteinGrams: 12,
        carbsGrams: 34,
        fatGrams: 14,
        tags: ['breakfast'],
      },
      {
        name: 'Berry Smoothie',
        calories: 250,
        proteinGrams: 10,
        carbsGrams: 42,
        fatGrams: 6,
        tags: ['drink'],
      },
      {
        name: 'Zucchini Pasta',
        calories: 280,
        proteinGrams: 16,
        carbsGrams: 30,
        fatGrams: 9,
        tags: ['dinner'],
      },
    ])

    const overview = await nutritionPlannerService.getNutritionPlannerOverview()

    expect(overview.meals.map((meal) => meal.name)).toEqual([
      'Avocado Toast',
      'Berry Smoothie',
      'Chicken Salad',
      'Zucchini Pasta',
    ])
    expect(overview.plan.plannedMeals).toHaveLength(3)
    expect(overview.plan.plannedMeals.map((meal) => meal.name)).toEqual([
      'Avocado Toast',
      'Berry Smoothie',
      'Chicken Salad',
    ])
    expect(overview.plan.totalCalories).toBe(990)
    expect(typeof overview.generatedAt).toBe('string')
  })

  test('getNutritionPlannerOverview filters meals by search term across names and tags', async () => {
    await nutritionPlannerModel.create([
      {
        name: 'Chicken Salad',
        calories: 420,
        proteinGrams: 35,
        carbsGrams: 20,
        fatGrams: 18,
        tags: ['high-protein'],
      },
      {
        name: 'Berry Smoothie',
        calories: 250,
        proteinGrams: 10,
        carbsGrams: 42,
        fatGrams: 6,
        tags: ['drink'],
      },
    ])

    const byName = await nutritionPlannerService.getNutritionPlannerOverview({
      search: 'berry',
    })
    const byTag = await nutritionPlannerService.getNutritionPlannerOverview({
      search: 'protein',
    })

    expect(byName.meals).toHaveLength(1)
    expect(byName.meals[0].name).toBe('Berry Smoothie')
    expect(byTag.meals).toHaveLength(1)
    expect(byTag.meals[0].name).toBe('Chicken Salad')
  })

  test('calculateCalorieGoal returns the expected macros and calorie target', () => {
    const result = nutritionPlannerService.calculateCalorieGoal({
      weightKg: 70,
      heightCm: 175,
      age: 30,
      gender: 'male',
      activityMultiplier: 1.55,
      goal: 'lose',
    })

    expect(result).toEqual({
      maintenanceCalories: 2556,
      targetCalories: 2056,
      proteinGrams: 154,
      carbsGrams: 231,
      fatGrams: 57,
    })
  })

  test('getHydrationForDate delegates to progress charts and returns the expected shape', async () => {
    const getWaterSpy = jest
      .spyOn(progressChartsService, 'getWater')
      .mockResolvedValue({ date: '2026-06-10', glasses: 7 })

    const result = await nutritionPlannerService.getHydrationForDate(userId, {
      date: '2026-06-10',
    })

    expect(getWaterSpy).toHaveBeenCalledWith(userId, '2026-06-10')
    expect(result).toEqual({
      date: '2026-06-10',
      glasses: 7,
    })
  })

  test('getFavourites returns only the current user favourites', async () => {
    const otherUserId = new mongoose.Types.ObjectId()

    await favouriteModel.create([
      {
        userId,
        mealId: 'meal-1',
        name: 'Chicken Salad',
        calories: 420,
        img: 'chicken.jpg',
      },
      {
        userId: otherUserId,
        mealId: 'meal-2',
        name: 'Berry Smoothie',
        calories: 250,
        img: 'smoothie.jpg',
      },
    ])

    const result = await nutritionPlannerService.getFavourites(userId)

    expect(result.favourites).toHaveLength(1)
    expect(result.favourites[0]).toEqual({
      mealId: 'meal-1',
      name: 'Chicken Salad',
      calories: 420,
      img: 'chicken.jpg',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })

  test('addFavourite creates a favourite once and returns the existing record for duplicates', async () => {
    const created = await nutritionPlannerService.addFavourite(userId, {
      mealId: 'meal-1',
      name: 'Chicken Salad',
      calories: 420,
      img: 'chicken.jpg',
    })

    const duplicate = await nutritionPlannerService.addFavourite(userId, {
      mealId: 'meal-1',
      name: 'Chicken Salad',
      calories: 420,
      img: 'chicken.jpg',
    })

    expect(created.mealId).toBe('meal-1')
    expect(duplicate.mealId).toBe('meal-1')

    const savedFavourites = await favouriteModel.find({ userId }).lean()
    expect(savedFavourites).toHaveLength(1)
  })

  test('removeFavourite deletes a matching favourite and returns null when it is missing', async () => {
    await favouriteModel.create({
      userId,
      mealId: 'meal-1',
      name: 'Chicken Salad',
      calories: 420,
      img: 'chicken.jpg',
    })

    const deleted = await nutritionPlannerService.removeFavourite(userId, 'meal-1')
    const missing = await nutritionPlannerService.removeFavourite(userId, 'meal-1')

    expect(deleted.mealId).toBe('meal-1')
    expect(missing).toBeNull()

    const savedFavourites = await favouriteModel.find({ userId }).lean()
    expect(savedFavourites).toHaveLength(0)
  })

  test('getPlan returns an empty plan when none exists', async () => {
    const plan = await nutritionPlannerService.getPlan(userId, '2026-06-10')

    expect(plan).toEqual({
      date: '2026-06-10',
      breakfast: [],
      lunch: [],
      dinner: [],
    })
  })

  test('savePlan upserts a per-user per-date meal plan', async () => {
    const firstSave = await nutritionPlannerService.savePlan(userId, {
      date: '2026-06-10',
      breakfast: [{ id: 'b1', name: 'Oatmeal', calories: 300, img: '' }],
      lunch: [],
      dinner: [],
    })

    const secondSave = await nutritionPlannerService.savePlan(userId, {
      date: '2026-06-10',
      breakfast: [],
      lunch: [{ id: 'l1', name: 'Chicken Bowl', calories: 520, img: '' }],
      dinner: [],
    })

    expect(firstSave.date).toBe('2026-06-10')
    expect(secondSave.lunch).toEqual([
      { id: 'l1', name: 'Chicken Bowl', calories: 520, img: '' },
    ])

    const savedPlans = await mealPlanModel.find({ userId }).lean()
    expect(savedPlans).toHaveLength(1)
    expect(savedPlans[0].breakfast).toEqual([])
    expect(savedPlans[0].lunch).toEqual([
      { id: 'l1', name: 'Chicken Bowl', calories: 520, img: '' },
    ])
  })
})
