import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { submitFormSchema } from "@/lib/validations"
import { google } from "googleapis"

// Google Sheets integration function
async function addToGoogleSheets(submissionData: any, formTitle: string) {
  try {
    // Set up Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GCS_PROJECT_ID,
        private_key_id: '',
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_ID

    if (!spreadsheetId) {
      console.error('Google Sheets ID not configured')
      return null
    }

    // Create a structured row for the submission
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // Helper function to extract URL from file object or return string
    const getFileUrl = (fileData: any): string => {
      if (!fileData) return '';
      if (typeof fileData === 'string') return fileData;
      if (Array.isArray(fileData) && fileData.length > 0) {
        return fileData[0].url || '';
      }
      if (fileData.url) return fileData.url;
      return '';
    };

    // Structure the data for Store Audit Form
    const rowData = [
      timestamp,                                    // A: Timestamp
      submissionData.audit_date || '',             // B: Audit Date
      submissionData.employee_name || '',          // C: Employee Name  
      submissionData.store_location || '',         // D: Store Location
      getFileUrl(submissionData.before_image),     // E: Before Image URL
      getFileUrl(submissionData.after_image),      // F: After Image URL
      Array.isArray(submissionData.out_of_stock)   // G: Out of Stock Items
        ? submissionData.out_of_stock.join(', ') 
        : (submissionData.out_of_stock || ''),
      submissionData.notes || '',                  // H: Notes
      formTitle                                    // I: Form Title
    ]

    // Try to append to "Submissions" sheet directly
    let sheetName = 'Submissions'
    let result
    
    try {
      // Try to append directly - this is much faster
      result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:I`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      })
    } catch (error: any) {
      // If sheet doesn't exist or has issues, create it with headers and retry
      if (error?.code === 400 || error?.message?.includes('Unable to parse range')) {
        console.log('Creating new sheet with headers...')
        
        // Create sheet with headers in one operation
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                }
              }
            }]
          }
        })
        
        // Add headers and data in one batch operation
        const headerRow = [
          'Timestamp',
          'Audit Date', 
          'Employee Name',
          'Store Location',
          'Before Image',
          'After Image', 
          'Out of Stock Items',
          'Notes',
          'Form Title'
        ]
        
        result = await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: [
              {
                range: `${sheetName}!A1:I1`,
                values: [headerRow]
              },
              {
                range: `${sheetName}!A2:I2`,
                values: [rowData]
              }
            ]
          }
        })
      } else {
        throw error
      }
    }

    console.log('✅ Successfully added to Google Sheets')
    return result.data.updatedRange || `${sheetName}!A:I`

  } catch (error) {
    console.error('❌ Error adding to Google Sheets:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 50000) // 50 second timeout
    })

    const processSubmission = async () => {
      // No authentication required for form submissions
      const body = await request.json()
      const validatedData = submitFormSchema.parse(body)

      // For performance, skip database check and write directly to Google Sheets
      // Use formId as title if needed
      const formTitle = validatedData.formId || 'Form Submission'
      
      console.log('📝 Writing submission directly to Google Sheets...')
      const sheetsResult = await addToGoogleSheets(validatedData.data, formTitle)
      
      if (!sheetsResult) {
        console.error('❌ Failed to write to Google Sheets')
        return NextResponse.json(
          { error: "Failed to save submission" },
          { status: 500 }
        )
      }

      console.log('✅ Successfully written to Google Sheets:', sheetsResult)

      // Generate a simple submission ID for response
      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      return NextResponse.json(
        {
          id: submissionId,
          message: "Form submitted successfully",
          submittedAt: new Date().toISOString(),
          sheetsRange: sheetsResult,
        },
        { status: 201 }
      )
    }

    // Race between submission and timeout
    return await Promise.race([processSubmission(), timeoutPromise])
  } catch (error) {
    console.error("Form submission error:", error)
    
    if (error instanceof Error && error.message === "Request timeout") {
      return NextResponse.json(
        { error: "Request timeout. Please try again." },
        { status: 408 }
      )
    }
    
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const formId = url.searchParams.get("formId")

    let whereClause: any = {}
    
    // If formId is specified, only return submissions for that form
    if (formId) {
      // Check if user has access to this form
      const form = await prisma.form.findFirst({
        where: {
          id: formId,
          OR: [
            { createdById: session.user.id },
            // Add admin access if needed
            ...(session.user.role === "ADMIN" ? [{}] : []),
          ],
        },
      })

      if (!form) {
        return NextResponse.json(
          { error: "Form not found or access denied" },
          { status: 404 }
        )
      }

      whereClause.formId = formId
    } else {
      // Return user's own submissions or forms they created
      whereClause.OR = [
        { userId: session.user.id },
        { form: { createdById: session.user.id } },
      ]
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        form: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error("Submissions fetch error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}