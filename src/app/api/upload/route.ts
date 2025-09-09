import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    type: 'service_account',
    project_id: process.env.GCS_PROJECT_ID,
    private_key_id: '',
    private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GCS_CLIENT_EMAIL,
    client_id: '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
  },
})

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fieldId = formData.get('fieldId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!fieldId) {
      return NextResponse.json({ error: 'No fieldId provided' }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${fieldId}/${uuidv4()}.${fileExtension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Google Cloud Storage
    const gcsFile = bucket.file(fileName)
    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.type,
      },
    })

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Upload error:', error)
        resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }))
      })

      stream.on('finish', async () => {
        try {
          // For uniform bucket-level access, we don't need to make individual files public
          // The bucket should be configured with public access at the bucket level
          
          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`
          
          resolve(NextResponse.json({
            success: true,
            url: publicUrl,
            fileName: fileName,
            size: file.size,
            type: file.type,
          }))
        } catch (error) {
          console.error('Error processing upload:', error)
          resolve(NextResponse.json({ error: 'Upload completed but failed to process' }, { status: 500 }))
        }
      })

      stream.end(buffer)
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}