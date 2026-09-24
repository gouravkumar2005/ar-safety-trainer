// One error type for every expected failure, plus the Express handler that
// turns it into a JSON response. Response shape:
//   { error: 'code', message: 'text', fields?: { fieldName: 'code' } }
// The app translates `error` / field codes into English or Hindi itself.

export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message || code)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// eslint-disable-next-line no-unused-vars -- Express needs all 4 params
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message, fields: err.fields })
    return
  }
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    res.status(400).json({ error: 'bad_request', message: 'Malformed request body' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'server_error', message: 'Something went wrong' })
}
