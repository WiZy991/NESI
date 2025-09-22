import jwt from 'jsonwebtoken'

export function signJWT(payload: object) {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined')

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyJWT(token: string): any {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined')

  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}
