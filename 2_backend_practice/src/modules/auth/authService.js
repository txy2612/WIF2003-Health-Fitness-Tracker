import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import profileModel from '../profile/profileModel.js'

// Helper function to generate the token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '30d' // Token expires in 30 days
    })
}

async function registerUser(userData) {
    //Check if email is already taken
    const existingUser = await profileModel.findOne({ email: userData.email })
    if (existingUser) {
        const error = new Error('Email is already registered')
        error.statusCode = 409 // Conflict
        throw error
    }

    //Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(userData.password, salt)

    //Create the user
    const user = await profileModel.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        age: userData.age || null,
        gender: userData.gender || null,
        weight: userData.weight || null,
        height: userData.height || null,
        goal: userData.goal || null
    })

    //Generate token and return clean user data
    return {
        token: generateToken(user._id)
    }
}

async function loginUser(email, password) {
    //Find user by email
    const user = await profileModel.findOne({ email })
    if (!user) {
        const error = new Error('Invalid email or password')
        error.statusCode = 401 // Unauthorized
        throw error
    }

    //Check if password matches the hash
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        const error = new Error('Invalid email or password')
        error.statusCode = 401
        throw error
    }

    return {
        token: generateToken(user._id)
    }
}

export default {
    registerUser,
    loginUser
}