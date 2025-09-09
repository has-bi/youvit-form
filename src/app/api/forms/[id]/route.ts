import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createFormSchema } from "@/lib/validations"

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const form = await prisma.form.findUnique({
      where: { id: context.params.id },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(form)
  } catch (error) {
    console.error("Form fetch error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const form = await prisma.form.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        createdById: true,
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // Check if user has permission to edit
    if (form.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // For PATCH, we allow partial updates
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.schema !== undefined) updateData.schema = body.schema

    const updatedForm = await prisma.form.update({
      where: { id: context.params.id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updatedForm)
  } catch (error) {
    console.error("Form update error:", error)
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid form data", details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const form = await prisma.form.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        createdById: true,
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // Check if user has permission to delete
    if (form.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    await prisma.form.delete({
      where: { id: context.params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Form deletion error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}