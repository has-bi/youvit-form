import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getToken } from "next-auth/jwt"

export async function GET(request: NextRequest) {
  try {
    // Get the session (which now uses JWT strategy)
    const session = await auth()
    
    // Get the raw JWT token
    const token = await getToken({ 
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET 
    })

    if (!session || !token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: "JWT authentication is working!",
      strategy: "JWT tokens",
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
      },
      tokenInfo: {
        sub: token.sub,
        email: token.email,
        name: token.name,
        role: token.role,
        iat: new Date(token.iat! * 1000).toISOString(),
        exp: new Date(token.exp! * 1000).toISOString(),
      },
    })
  } catch (error) {
    console.error("Token info error:", error)
    return NextResponse.json(
      { error: "Failed to get token info" },
      { status: 500 }
    )
  }
}