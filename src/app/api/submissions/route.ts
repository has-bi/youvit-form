import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { submitFormSchema } from "@/lib/validations"
import { google } from "googleapis"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Google Sheets integration function
type SheetEmployee = {
  id: string | undefined
  name: string | undefined
}

type SheetStore = {
  id: string | undefined
  name: string | undefined
  location: string | undefined
  region: string | undefined
  manager: string | undefined
}

async function fetchAllowedSheetData(options: {
  includeEmployees: boolean
  includeStores: boolean
}) {
  const { includeEmployees, includeStores } = options

  if (!includeEmployees && !includeStores) {
    return { employees: [] as SheetEmployee[], stores: [] as SheetStore[] }
  }

  if (
    !process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    !process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    !process.env.GOOGLE_SPREADSHEET_ID
  ) {
    throw new Error("Google Sheets configuration missing")
  }

  const jwt = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, jwt)
  await doc.loadInfo()

  let employees: SheetEmployee[] = []
  if (includeEmployees) {
    const employeeSheet = doc.sheetsByTitle["Employees"]
    if (!employeeSheet) {
      throw new Error("Employees sheet not found")
    }

    const rows = await employeeSheet.getRows()
    employees = rows.map((row) => ({
      id: row.get("employee_id"),
      name: row.get("name"),
    }))
  }

  let stores: SheetStore[] = []
  if (includeStores) {
    const storeSheet = doc.sheetsByTitle["Stores"]
    if (!storeSheet) {
      throw new Error("Stores sheet not found")
    }

    const rows = await storeSheet.getRows()
    stores = rows.map((row) => ({
      id: row.get("store_id"),
      name: row.get("name"),
      location: row.get("location"),
      region: row.get("region"),
      manager: row.get("manager"),
    }))
  }

  return { employees, stores }
}

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
      submissionData.visibility || '',             // G: Visibility
      Array.isArray(submissionData.out_of_stock)   // H: Out of Stock Items
        ? submissionData.out_of_stock.join(', ') 
        : (submissionData.out_of_stock || ''),
      submissionData.notes || '',                  // I: Notes
      formTitle                                    // J: Form Title
    ]

    // Try to append to "Submissions" sheet directly
    let sheetName = 'Submissions'
    let result
    
    try {
      // Try to append directly - this is much faster
      result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:J`,
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
          'Visibility',
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
                range: `${sheetName}!A1:J1`,
                values: [headerRow]
              },
              {
                range: `${sheetName}!A2:J2`,
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
    return result.data.updatedRange || `${sheetName}!A:J`

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

      const normalizeValue = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase()

      const submissionData = validatedData.data
      const employeeNameValue = submissionData?.employee_name
      const storeLocationValue = submissionData?.store_location
      const notesValue = submissionData?.notes

      if (employeeNameValue !== undefined || storeLocationValue !== undefined) {
        try {
          const { employees, stores } = await fetchAllowedSheetData({
            includeEmployees: employeeNameValue !== undefined,
            includeStores: storeLocationValue !== undefined,
          })

          if (employeeNameValue !== undefined) {
            if (typeof employeeNameValue !== "string") {
              return NextResponse.json(
                { error: "Employee name must be a valid string" },
                { status: 400 }
              )
            }

            const trimmedEmployeeName = employeeNameValue.trim()
            if (!trimmedEmployeeName) {
              return NextResponse.json(
                { error: "Employee name is required" },
                { status: 400 }
              )
            }

            const allowedEmployeeNames = new Set(
              employees
                .map((employee) => employee.name)
                .filter((name): name is string => Boolean(name))
                .map((name) => normalizeValue(name))
            )

            if (!allowedEmployeeNames.has(normalizeValue(trimmedEmployeeName))) {
              return NextResponse.json(
                { error: "Employee name must match an existing employee" },
                { status: 400 }
              )
            }

            submissionData.employee_name = trimmedEmployeeName
          }

          if (storeLocationValue !== undefined) {
            if (typeof storeLocationValue !== "string") {
              return NextResponse.json(
                { error: "Store location must be a valid string" },
                { status: 400 }
              )
            }

            const trimmedStoreLocation = storeLocationValue.trim()
            if (!trimmedStoreLocation) {
              return NextResponse.json(
                { error: "Store location is required" },
                { status: 400 }
              )
            }

            const allowedStoreValues = new Set<string>()
            stores.forEach((store) => {
              if (!store.name) return
              const trimmedName = store.name.trim()
              if (trimmedName) {
                allowedStoreValues.add(normalizeValue(trimmedName))
              }

              if (store.location) {
                const trimmedLocation = store.location.trim()
                if (trimmedName && trimmedLocation) {
                  allowedStoreValues.add(
                    normalizeValue(`${trimmedName} - ${trimmedLocation}`)
                  )
                }
              }
            })

            if (!allowedStoreValues.has(normalizeValue(trimmedStoreLocation))) {
              return NextResponse.json(
                { error: "Store location must match an existing store" },
                { status: 400 }
              )
            }

            submissionData.store_location = trimmedStoreLocation
          }
        } catch (validationError) {
          console.error("Sheets validation error:", validationError)
          return NextResponse.json(
            { error: "Failed to validate submission data" },
            { status: 500 }
          )
        }
      }

      if (notesValue !== undefined) {
        if (typeof notesValue !== "string") {
          return NextResponse.json(
            { error: "Notes must be provided as text" },
            { status: 400 }
          )
        }

        const trimmedNotes = notesValue.trim()
        if (trimmedNotes.length > 200) {
          return NextResponse.json(
            { error: "Notes must be 200 characters or fewer" },
            { status: 400 }
          )
        }

        submissionData.notes = trimmedNotes
      }

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
