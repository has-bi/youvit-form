import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (
      !process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
      !process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
      !process.env.GOOGLE_SPREADSHEET_ID
    ) {
      return NextResponse.json(
        { error: "Google Sheets configuration missing" },
        { status: 500 }
      );
    }

    // Initialize JWT authentication
    const jwt = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, jwt);
    await doc.loadInfo();

    // Get query parameter for which data to fetch
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "employees") {
      const employeeSheet = doc.sheetsByTitle["Employees"];
      if (!employeeSheet) {
        return NextResponse.json(
          { error: "Employees sheet not found" },
          { status: 404 }
        );
      }

      const rows = await employeeSheet.getRows();
      const employees = rows.map((row) => ({
        id: row.get("employee_id"),
        name: row.get("name"),
      }));

      return NextResponse.json({ employees });
    } else if (type === "stores") {
      const storeSheet = doc.sheetsByTitle["Stores"];
      if (!storeSheet) {
        return NextResponse.json(
          { error: "Stores sheet not found" },
          { status: 404 }
        );
      }

      const rows = await storeSheet.getRows();
      const stores = rows.map((row) => ({
        id: row.get("store_id"),
        name: row.get("name"),
        location: row.get("location"),
        region: row.get("region"),
        manager: row.get("manager"),
      }));

      return NextResponse.json({ stores });
    } else {
      // Get both employees and stores
      const employeeSheet = doc.sheetsByTitle["Employees"];
      const storeSheet = doc.sheetsByTitle["Stores"];

      const employeeRows = employeeSheet ? await employeeSheet.getRows() : [];
      const storeRows = storeSheet ? await storeSheet.getRows() : [];

      const employees = employeeRows.map((row) => ({
        id: row.get("employee_id"),
        name: row.get("name"),
      }));

      const stores = storeRows.map((row) => ({
        id: row.get("store_id"),
        name: row.get("name"),
        location: row.get("location"),
        region: row.get("region"),
        manager: row.get("manager"),
      }));

      return NextResponse.json({ employees, stores });
    }
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from sheets" },
      { status: 500 }
    );
  }
}
