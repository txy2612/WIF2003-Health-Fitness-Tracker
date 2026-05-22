//without this: ev teammate return diff errors
// sometimes msg, smtimes error, smtimes detail
//helpers that formats errors consistently (return same format for all errors)

export default function problemDetails({
  type = 'about:blank',
  title,// Validation Failed, Workout Not Found
  status,//400 404 500
  detail,// human readable explanation : Duration must be greater than 0
  instance,// api/nutrition_planner/123 meaning: which endpoint caused issue
  requestId,
  errors = null
}) {
  return {
    type,
    title,
    status,
    detail,
    instance,
    requestId,
    errors
  }
}
