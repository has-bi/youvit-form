"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, CheckCircle, AlertCircle, Camera } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getReadableErrorMessage } from "@/lib/utils";

// Form schema
const storeAuditSchema = z.object({
  audit_date: z.string().min(1, "Date is required"),
  employee_name: z.string().min(1, "Employee name is required"),
  store_location: z.string().min(1, "Store location is required"),
  visibility: z.string().min(1, "Visibility selection is required"),
  before_image: z.string().optional(),
  after_image: z.string().optional(),
  out_of_stock: z.array(z.string()).optional().default([]),
  notes: z
    .string()
    .max(200, "Notes must be 200 characters or fewer")
    .optional(),
});

type StoreAuditFormData = z.infer<typeof storeAuditSchema>;

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  region: string;
  manager: string;
}

interface AppleStyleFormProps {
  onSuccess?: (data: any) => void;
}

// Common out-of-stock items
const OUT_OF_STOCK_ITEMS = [
  "Youvit Adult Multivitamin 7 Day",
  "Youvit Adult Apple Cider 7 Day",
  "Youvit Adult Ezzleep 7 Day",
  "Youvit Kids Multivitamin 7 Day",
  "Youvit Kids Multivitamin 30 Day",
  "Youvit Kids Omega 7 Day",
  "Youvit Kids Omega 30 Day",
  "Youvit Kids Curcuma 7 Day",
  "Youvit Female Beauti+ 7 Day",
  "Youvit Female Collagen 7 Day",
];

const VISIBILITY_OPTIONS = [
  "COC Acrylic Adults (MAP Sport)",
  "COC Acrylic Kids (MAP Kids)",
  "Homeshelf Display (MAP Kids)",
  "Standee Kids (Kimia Farma)",
  "Carton Tray Kids (Kimia Farma)",
  "Homeshelf Display (Kimia Farma)",
  "Display COC (Kimia Farma)",
  "Carton Tray Kids (Raja Susu)",
];

export function AppleStyleForm({ onSuccess }: AppleStyleFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagesUploaded, setImagesUploaded] = useState(false);
  const [savingToSheets, setSavingToSheets] = useState(false);
  const [beforeImageUploading, setBeforeImageUploading] = useState(false);
  const [afterImageUploading, setAfterImageUploading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<StoreAuditFormData>({
    resolver: zodResolver(storeAuditSchema),
    defaultValues: {
      audit_date: new Date().toISOString().split("T")[0],
      employee_name: "",
      store_location: "",
      visibility: "",
      before_image: "",
      after_image: "",
      out_of_stock: [],
      notes: "",
    },
  });

  const notesValue = form.watch("notes") || "";

  // Filter employees and stores based on search
  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredStores = stores.filter((store) =>
    `${store.name} - ${store.location}`
      .toLowerCase()
      .includes(storeSearch.toLowerCase())
  );

  // Fetch employees and stores data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/sheets-data");
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
          setStores(data.stores || []);
        } else {
          console.error("Failed to fetch spreadsheet data");
          toast.error("Failed to load data");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error loading form");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Image upload function
  const uploadImage = async (
    file: File,
    fieldName: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fieldId", fieldName);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();
    return result.url;
  };

  // Handle image selection (not upload yet)
  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: "before_image" | "after_image"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Store file locally, don't upload yet
    if (fieldName === "before_image") {
      setBeforeImageFile(file);
      form.setValue(fieldName, "selected"); // Set a placeholder value
    } else {
      setAfterImageFile(file);
      form.setValue(fieldName, "selected"); // Set a placeholder value
    }

    toast.success("Image selected successfully!");
  };

  // Upload image during form submission
  const uploadImageDuringSubmission = async (
    file: File,
    fieldName: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fieldId", fieldName);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();
    return result.url;
  };

  // Handle out of stock items
  const handleOutOfStockChange = (item: string, checked: boolean) => {
    const currentItems = form.getValues("out_of_stock");
    if (checked) {
      form.setValue("out_of_stock", [...currentItems, item]);
    } else {
      form.setValue(
        "out_of_stock",
        currentItems.filter((i) => i !== item)
      );
    }
  };

  // Form submission
  const onSubmit = async (data: StoreAuditFormData) => {
    setSubmitting(true);
    setSubmissionError(null);
    form.clearErrors(["employee_name", "store_location"]);
    setUploadingImages(false);
    setImagesUploaded(false);
    setSavingToSheets(false);

    try {
      // Upload images first if selected
      let beforeImageUrl = "";
      let afterImageUrl = "";

      if (beforeImageFile || afterImageFile) {
        setUploadingImages(true);

        if (beforeImageFile) {
          beforeImageUrl = await uploadImageDuringSubmission(
            beforeImageFile,
            "before_image"
          );
        }

        if (afterImageFile) {
          afterImageUrl = await uploadImageDuringSubmission(
            afterImageFile,
            "after_image"
          );
        }

        setUploadingImages(false);
        setImagesUploaded(true);

        // Small delay to show the upload success feedback
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Now save to sheets
      setSavingToSheets(true);

      // Update data with actual image URLs
      const submissionData = {
        ...data,
        before_image: beforeImageUrl,
        after_image: afterImageUrl,
      };

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: "merchandising-day-vol-2",
          data: submissionData,
        }),
      });

      if (!response.ok) {
        const errorMessage = await getReadableErrorMessage(
          response,
          "We couldn't submit the form. Please review the highlighted fields."
        );
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Form submitted successfully");
      setSubmissionError(null);

      if (onSuccess) {
        onSuccess(result);
      }

      // Reset form and images
      form.reset();
      setBeforeImageFile(null);
      setAfterImageFile(null);
    } catch (error) {
      console.error("Submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't submit the form. Please review the highlighted fields.";

      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("employee")) {
        form.setError("employee_name", { type: "manual", message });
      }

      if (lowerMessage.includes("store")) {
        form.setError("store_location", { type: "manual", message });
      }

      setSubmissionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
      setImagesUploaded(false);
      setSavingToSheets(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-64 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </CardHeader>

            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-18" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                  </div>
                </div>

                {/* Out of Stock Section */}
                <div className="space-y-4">
                  <Skeleton className="h-4 w-48" />
                  <div className="grid grid-cols-1 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <Skeleton className="h-12 w-40 rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Submission Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <CheckCircle className="absolute inset-0 m-auto h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {uploadingImages
                ? "Uploading images..."
                : savingToSheets
                ? "Saving your response..."
                : "Submitting your response..."}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {uploadingImages
                ? "Processing your images"
                : savingToSheets
                ? "Saving to spreadsheet"
                : "Please wait while we save your data"}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading images</span>
                {uploadingImages ? (
                  <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                ) : imagesUploaded || (!beforeImageFile && !afterImageFile) ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-gray-300">○</span>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Saving to spreadsheet</span>
                {savingToSheets ? (
                  <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                ) : imagesUploaded || (!beforeImageFile && !afterImageFile) ? (
                  <span className="text-gray-300">○</span>
                ) : (
                  <span className="text-gray-300">○</span>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Completing submission</span>
                <span>○</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle background elements */}
      <div className="absolute left-8 bottom-8 opacity-8 hidden xl:block">
        <Image
          src="/images/velma 3d.png"
          alt=""
          width={100}
          height={100}
          className="select-none pointer-events-none filter grayscale opacity-60"
        />
      </div>
      <div className="absolute right-8 bottom-8 opacity-8 hidden xl:block">
        <Image
          src="/images/tony 3d.png"
          alt=""
          width={100}
          height={100}
          className="select-none pointer-events-none filter grayscale opacity-60"
        />
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 relative z-10">
        <Card className="shadow-sm border border-gray-200 bg-white">
          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-light text-gray-900 mb-3">
              Merchandising Day Vol 2
            </CardTitle>
            <p className="text-gray-500 font-light">Complete your response</p>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-8">
            {submissionError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submissionError}
              </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="audit_date"
                      className="text-sm font-medium text-gray-700"
                    >
                      Date
                    </Label>
                    <Input
                      id="audit_date"
                      type="date"
                      {...form.register("audit_date")}
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-colors"
                    />
                    {form.formState.errors.audit_date && (
                      <p className="text-red-600 text-sm">
                        {form.formState.errors.audit_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="employee_name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Employee Name
                    </Label>
                    <Controller
                      name="employee_name"
                      control={form.control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="Type to search employee..."
                            className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            onChange={(e) => {
                              setEmployeeSearch(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            onFocus={() => setEmployeeSearch(field.value || "")}
                          />
                          {employeeSearch && filteredEmployees.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredEmployees.map((employee, index) => (
                                <div
                                  key={employee.id || `employee-${index}`}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                  onClick={() => {
                                    field.onChange(employee.name);
                                    setEmployeeSearch("");
                                  }}
                                >
                                  {employee.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    />
                    {form.formState.errors.employee_name && (
                      <p className="text-red-600 text-sm">
                        {form.formState.errors.employee_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="store_location"
                    className="text-sm font-medium text-gray-700"
                  >
                    Store Location
                  </Label>
                  <Controller
                    name="store_location"
                    control={form.control}
                    render={({ field }) => (
                      <div className="relative">
                        <Input
                          {...field}
                          placeholder="Type to search store location..."
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          onChange={(e) => {
                            setStoreSearch(e.target.value);
                            field.onChange(e.target.value);
                          }}
                          onFocus={() => setStoreSearch(field.value || "")}
                        />
                        {storeSearch && filteredStores.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredStores.map((store, index) => (
                              <div
                                key={store.id || `store-${index}`}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                onClick={() => {
                                  field.onChange(
                                    `${store.name} - ${store.location}`
                                  );
                                  setStoreSearch("");
                                }}
                              >
                                {store.name} - {store.location}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  />
                  {form.formState.errors.store_location && (
                    <p className="text-red-600 text-sm">
                      {form.formState.errors.store_location.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="visibility"
                    className="text-sm font-medium text-gray-700"
                  >
                    Visibility
                  </Label>
                  <Controller
                    name="visibility"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg bg-white">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          {VISIBILITY_OPTIONS.map((option) => (
                            <SelectItem
                              key={option}
                              value={option}
                              className="text-gray-700 focus:bg-blue-50 focus:text-blue-600"
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.visibility && (
                    <p className="text-red-600 text-sm">
                      {form.formState.errors.visibility.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Image Uploads */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Before Image
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
                      {beforeImageFile || form.watch("before_image") ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                            <div className="text-center">
                              <span className="font-medium block">
                                Before image selected
                              </span>
                              {beforeImageFile && (
                                <span className="text-sm text-gray-500 mt-1 block">
                                  {beforeImageFile.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBeforeImageFile(null);
                              form.setValue("before_image", "");
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageSelect(e, "before_image")
                            }
                            className="hidden"
                            id="before_image_input"
                            disabled={submitting}
                          />
                          <label
                            htmlFor="before_image_input"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            {submitting ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                            ) : (
                              <Camera className="w-10 h-10 text-gray-400 mb-3" />
                            )}
                            <span className="text-sm text-gray-600 font-medium">
                              {beforeImageUploading
                                ? "Uploading..."
                                : "Upload before image"}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">
                              {beforeImageUploading ? "" : "PNG, JPG up to 5MB"}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      After Image
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 hover:bg-green-50/30 transition-all duration-200">
                      {afterImageFile || form.watch("after_image") ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                            <div className="text-center">
                              <span className="font-medium block">
                                After image selected
                              </span>
                              {afterImageFile && (
                                <span className="text-sm text-gray-500 mt-1 block">
                                  {afterImageFile.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAfterImageFile(null);
                              form.setValue("after_image", "");
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageSelect(e, "after_image")
                            }
                            className="hidden"
                            id="after_image_input"
                            disabled={submitting}
                          />
                          <label
                            htmlFor="after_image_input"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            {submitting ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-3"></div>
                            ) : (
                              <Camera className="w-10 h-10 text-gray-400 mb-3" />
                            )}
                            <span className="text-sm text-gray-600 font-medium">
                              {afterImageUploading
                                ? "Uploading..."
                                : "Upload after image"}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">
                              {afterImageUploading ? "" : "PNG, JPG up to 5MB"}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Out of Stock Items */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">
                  Out of Stock Items
                </Label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 gap-4">
                    {OUT_OF_STOCK_ITEMS.map((item) => (
                      <div
                        key={item}
                        className="flex items-start space-x-3 py-2"
                      >
                        <Checkbox
                          id={`stock_${item}`}
                          checked={form.watch("out_of_stock").includes(item)}
                          onCheckedChange={(checked) =>
                            handleOutOfStockChange(item, !!checked)
                          }
                          className="mt-0.5 border-gray-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <Label
                          htmlFor={`stock_${item}`}
                          className="text-sm text-gray-700 cursor-pointer leading-relaxed"
                        >
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label
                  htmlFor="notes"
                  className="text-sm font-medium text-gray-700"
                >
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Share any additional observations or feedback..."
                  rows={4}
                  maxLength={200}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
                />
                <p className="text-xs text-gray-500 text-right">
                  {notesValue.length}/200 characters
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
