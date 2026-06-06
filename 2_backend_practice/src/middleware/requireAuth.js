import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import profileModel from '../modules/profile/profileModel.js'

const requireAuth = async (request, response, next) => {
    try {
        //check for authorization header
        const authHeader = request.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' })
        }

        //extract token string from header by removing 'Bearer ' prefix
        const token = authHeader.split(' ')[1]

        //verify token using secret key in env
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET)

        //find and get user id in database
        const userId = await profileModel.findById(decodedPayload.id).select('_id')

        if (!userId) {
            return response.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' })
        }

        //attach user id to request object
        request.user = { id: userId._id }

        next()

    } catch (error) {
        return response.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' })
    }
}

export default requireAuth