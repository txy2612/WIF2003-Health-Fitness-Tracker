import { ZodError } from 'zod'//zod = validation library = check if data has correct shape b4 backend uses it
import { StatusCodes } from 'http-status-codes'  //alows to write readable status code 
import problemDetails from '../shared/problemDetails.js'

// Zod(Validation) error
function formatZodErrors(error){
  return error.issues.reduce((errors, issue) =>{

    // Zod error paths may start with 'body', 'params', or 'query'
    // Example: ['body', 'email'] or ['query', 'page']
    // slice(1) removes the first item, so ['body', 'email'] becomes ['email']
    const path = issue.path[0] === 'body' || issue.path[0] === 'params' || issue.path[0] === 'query'
      ? issue.path.slice(1)
      : issue.path 
      // if(condition) { path = issue.path.slice(1) }
      // else { path = issue.path }
    
    const key = path.length > 0 ? path.join('.') : 'request'

    // if this field does not have am error array yet, create one
    errors[key] = errors[key] || [] // errors["email"] = []
    errors[key].push(issue.message) // errors["email"].push("Invalid email")

    return errors
  }, {})
}

/**
 * @type {import("express").ErrorRequestHandler}
 */
// Express knows this is an error handler because it has 4 parameters: (error, request, response, next)
// Normal middleware has 3: (request, response, next)
const errorHandler = (error, request, response, next) => {
    if (response.headersSent) {
        next(error);
        return;
    }

    if (error instanceof ZodError) {
        response.status(StatusCodes.BAD_REQUEST).type("application/problem+json").json(problemDetails({
            type: "about:blank",
            title: "Validation failed",
            status: StatusCodes.BAD_REQUEST,
            detail: "The request body, query, or route parameters are invalid.",
            instance: request.originalUrl,
            errors: formatZodErrors(error),
            requestId: request.id,
        }));
        return;
    }

    const status = error.status || error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const publicMessage = status >= StatusCodes.INTERNAL_SERVER_ERROR ? "Unexpected server error." : error.message;

    response.status(status).type("application/problem+json").json(problemDetails({
        type: error.type || "about:blank",
        title: error.title || error.message || "Internal Server Error",
        status,
        detail: publicMessage,
        instance: request.originalUrl,
        requestId: request.id,
    }));
};

const notFoundHandler = (request, response) => {
    response.status(StatusCodes.NOT_FOUND).type("application/problem+json").json(problemDetails({
        type: "about:blank",
        title: "Not Found",
        status: StatusCodes.NOT_FOUND,
        detail: "No route matched this request.",
        instance: request.originalUrl,
        requestId: request.id,
    }));
};

export { notFoundHandler, errorHandler }
export default errorHandler
