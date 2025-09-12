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

// Form schema
const storeAuditSchema = z.object({
  audit_date: z.string().min(1, "Date is required"),
  employee_name: z.string().min(1, "Employee name is required"),
  store_location: z.string().min(1, "Store location is required"),
  before_image: z
    .string()
    .url("Before image is required")
    .optional()
    .or(z.literal("")),
  after_image: z
    .string()
    .url("After image is required")
    .optional()
    .or(z.literal("")),
  out_of_stock: z.array(z.string()).default([]),
  notes: z.string().optional(),
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
  "Product A - Vitamin C 1000mg",
  "Product B - Multivitamin",
  "Product C - Omega 3",
  "Product D - Probiotics",
  "Product E - Calcium + D3",
  "Product F - Iron Supplement",
  "Product G - Magnesium",
  "Product H - Zinc",
  "Product I - B-Complex",
  "Product J - Vitamin D3",
];

export function AppleStyleForm({ onSuccess }: AppleStyleFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [beforeImageUploading, setBeforeImageUploading] = useState(false);
  const [afterImageUploading, setAfterImageUploading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  const form = useForm<StoreAuditFormData>({
    resolver: zodResolver(storeAuditSchema),
    defaultValues: {
      audit_date: new Date().toISOString().split("T")[0],
      employee_name: "",
      store_location: "",
      before_image: "",
      after_image: "",
      out_of_stock: [],
      notes: "",
    },
  });

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

  // Handle image uploads
  const handleImageUpload = async (
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const setUploading =
      fieldName === "before_image"
        ? setBeforeImageUploading
        : setAfterImageUploading;

    try {
      setUploading(true);
      const imageUrl = await uploadImage(file, fieldName);
      form.setValue(fieldName, imageUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
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
    try {
      setSubmitting(true);

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: "merchandising-day-vol-2",
          data: data,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      const result = await response.json();
      toast.success("Form submitted successfully");

      if (onSuccess) {
        onSuccess(result);
      }

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Submitting your audit...
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please wait while we save your data
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading images</span>
                <span>✓</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Saving to spreadsheet</span>
                <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Generating report</span>
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
            <p className="text-gray-500 font-light">
              Complete your store audit
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-8">
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
              </div>

              {/* Image Uploads */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Before Image
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
                      {form.watch("before_image") ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                            <span className="font-medium">
                              Before image uploaded
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("before_image", "")}
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
                              handleImageUpload(e, "before_image")
                            }
                            className="hidden"
                            id="before_image_input"
                            disabled={beforeImageUploading}
                          />
                          <label
                            htmlFor="before_image_input"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            {beforeImageUploading ? (
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
                      {form.watch("after_image") ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                            <span className="font-medium">
                              After image uploaded
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("after_image", "")}
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
                              handleImageUpload(e, "after_image")
                            }
                            className="hidden"
                            id="after_image_input"
                            disabled={afterImageUploading}
                          />
                          <label
                            htmlFor="after_image_input"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            {afterImageUploading ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
                  disabled={
                    submitting || beforeImageUploading || afterImageUploading
                  }
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
