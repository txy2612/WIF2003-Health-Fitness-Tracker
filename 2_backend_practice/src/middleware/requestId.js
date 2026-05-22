//requestId = give ev client a tracking number b4 entering = every request has an Id

import crypto from 'crypto'//handles encryption, hashing, random values, UUID generation

// request = headers, body, params [ what brought by the client]
// response = what backend sends back
export default function requestId(request, response, next) {

//checks if frontend/client already sent an Id
// if not yet -> generate UUID
  const id = request.headers['x-request-id'] || crypto.randomUUID()

  request.id = id
  response.setHeader('X-Request-Id', id)// add id into header with the response body

  next()// w/o this request hangs forver
}
