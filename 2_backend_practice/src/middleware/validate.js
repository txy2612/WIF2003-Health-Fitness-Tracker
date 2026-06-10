// module schema = rules
// validate.js = safeguard

export default function validate(schema) {//receives zod schema
  return (request, response, next) => {
    try {
      const validated = schema.parse({//checks whether request data is valid
        // GET requests usually do not have a body, so use an empty object.
        body: request.body || {},
        query: request.query,
        params: request.params,
      })

      // stores validated ver inside request
      request.validated = validated

      //allows request to continue to controller
      next()
    } catch (error) {
      next(error)
    }
  }
}
