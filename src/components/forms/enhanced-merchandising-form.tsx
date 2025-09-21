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
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  Heart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getReadableErrorMessage } from "@/lib/utils";

// Form schema
const storeAuditSchema = z.object({
  audit_date: z.string().min(1, "Audit date is required"),
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
  notes: z.string().max(200, "Notes must be 200 characters or fewer").optional(),
});

type StoreAuditFormData = z.infer<typeof storeAuditSchema>;

interface Employee {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  region: string;
  manager: string;
}

interface EnhancedMerchandisingFormProps {
  onSuccess?: (data: any) => void;
}

// Common out-of-stock items with fun emojis
const OUT_OF_STOCK_ITEMS = [
  "🟠 Product A - Vitamin C 1000mg",
  "💊 Product B - Multivitamin",
  "🐟 Product C - Omega 3",
  "🦠 Product D - Probiotics",
  "🦴 Product E - Calcium + D3",
  "⚡ Product F - Iron Supplement",
  "✨ Product G - Magnesium",
  "🛡️ Product H - Zinc",
  "🌟 Product I - B-Complex",
  "☀️ Product J - Vitamin D3",
];

export function EnhancedMerchandisingForm({
  onSuccess,
}: EnhancedMerchandisingFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [beforeImageUploading, setBeforeImageUploading] = useState(false);
  const [afterImageUploading, setAfterImageUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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

  const notesValue = form.watch("notes") || "";

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
          toast.error("Failed to load employee and store data");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error loading form data");
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
      toast.error("Please select an image file 📸");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB 📏");
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
      toast.success("Image uploaded successfully! ✨");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image 😞");
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
    setSubmitting(true);
    setSubmissionError(null);
    form.clearErrors(["employee_name", "store_location"]);

    try {
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
        const errorMessage = await getReadableErrorMessage(
          response,
          "We couldn't submit the audit. Please review the highlighted fields."
        );
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Merchandising audit submitted successfully! 🎉");
      setSubmissionError(null);

      if (onSuccess) {
        onSuccess(result);
      }

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't submit the audit. Please review the highlighted fields.";

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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="relative mb-4">
              <Image
                src="/images/oliver 3d.png"
                alt="Oliver loading"
                width={80}
                height={80}
                className="animate-bounce"
              />
            </div>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">
                Getting everything ready for you...
              </p>
              <p className="text-sm text-gray-500 mt-1">Loading form data ✨</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with monsters */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <Image
              src="/images/velma 3d.png"
              alt="Velma"
              width={60}
              height={60}
              className="animate-pulse"
            />
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              <h1 className="text-4xl font-bold mb-2">
                Merchandising Day Vol 2
              </h1>
              <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
                <Heart className="w-5 h-5 text-pink-500" />
                <span>Making stores healthier, together</span>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <Image
              src="/images/tony 3d.png"
              alt="Tony"
              width={60}
              height={60}
              className="animate-pulse delay-500"
            />
          </div>
        </div>

        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur overflow-hidden">
          {/* Progress indicator */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>

          <CardHeader className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/oliver 3d.png"
                alt="Oliver"
                width={80}
                height={80}
                className="drop-shadow-lg"
              />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Let's make this store amazing! ✨
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Fill out your merchandising audit with love and care
            </p>
          </CardHeader>

          <CardContent className="p-8">
            {submissionError && (
              <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50/80 p-4 text-base text-red-700">
                {submissionError}
              </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Step 1: Basic Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border-2 border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="audit_date"
                      className="text-lg font-semibold text-gray-700 flex items-center gap-2"
                    >
                      📅 Audit Date
                    </Label>
                    <Input
                      id="audit_date"
                      type="date"
                      {...form.register("audit_date")}
                      className="h-14 text-lg rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:ring-pink-300 transition-all"
                    />
                    {form.formState.errors.audit_date && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {form.formState.errors.audit_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="employee_name"
                      className="text-lg font-semibold text-gray-700 flex items-center gap-2"
                    >
                      👤 Employee Name
                    </Label>
                    <Controller
                      name="employee_name"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-14 text-lg rounded-xl border-2 border-pink-200 focus:border-pink-400">
                            <SelectValue placeholder="Select your name" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem
                                key={employee.id}
                                value={employee.name}
                                className="text-lg"
                              >
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.employee_name && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {form.formState.errors.employee_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <Label
                    htmlFor="store_location"
                    className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-3"
                  >
                    🏪 Store Location
                  </Label>
                  <Controller
                    name="store_location"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-14 text-lg rounded-xl border-2 border-pink-200 focus:border-pink-400">
                          <SelectValue placeholder="Choose store location" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem
                              key={store.id}
                              value={`${store.name} - ${store.location}`}
                              className="text-lg"
                            >
                              {store.name} - {store.location} ({store.region})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.store_location && (
                    <p className="text-red-500 text-sm flex items-center gap-1 mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {form.formState.errors.store_location.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Photo Documentation */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Photo Documentation 📸
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Before Image */}
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                      📷 Before Image
                    </Label>
                    <div className="border-3 border-dashed border-purple-200 rounded-2xl p-6 text-center bg-white hover:bg-purple-50 transition-all">
                      {form.watch("before_image") ? (
                        <div className="space-y-4">
                          <img
                            src={form.watch("before_image")}
                            alt="Before"
                            className="w-full h-48 object-cover rounded-xl shadow-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("before_image", "")}
                            className="rounded-full border-2 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove Photo
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
                              <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
                                <p className="text-purple-600 font-medium">
                                  Uploading your photo... ✨
                                </p>
                              </>
                            ) : (
                              <>
                                <Camera className="w-12 h-12 text-purple-400 mb-4" />
                                <p className="text-purple-600 font-medium text-lg">
                                  Tap to capture before photo
                                </p>
                                <p className="text-gray-500 text-sm mt-2">
                                  Show us how it looked initially
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Image */}
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                      ✨ After Image
                    </Label>
                    <div className="border-3 border-dashed border-pink-200 rounded-2xl p-6 text-center bg-white hover:bg-pink-50 transition-all">
                      {form.watch("after_image") ? (
                        <div className="space-y-4">
                          <img
                            src={form.watch("after_image")}
                            alt="After"
                            className="w-full h-48 object-cover rounded-xl shadow-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("after_image", "")}
                            className="rounded-full border-2 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove Photo
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
                              <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mb-4"></div>
                                <p className="text-pink-600 font-medium">
                                  Uploading your amazing work... ✨
                                </p>
                              </>
                            ) : (
                              <>
                                <Camera className="w-12 h-12 text-pink-400 mb-4" />
                                <p className="text-pink-600 font-medium text-lg">
                                  Tap to capture after photo
                                </p>
                                <p className="text-gray-500 text-sm mt-2">
                                  Show us your amazing transformation!
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Inventory Check */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-2xl border-2 border-orange-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Inventory Check 📦
                  </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-orange-100">
                  <Label className="text-lg font-semibold text-gray-700 mb-4 block">
                    Which products are out of stock? (Check all that apply)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {OUT_OF_STOCK_ITEMS.map((item) => (
                      <div
                        key={item}
                        className="flex items-center space-x-3 p-3 rounded-xl hover:bg-orange-50 transition-all"
                      >
                        <Checkbox
                          id={`stock_${item}`}
                          checked={form.watch("out_of_stock").includes(item)}
                          onCheckedChange={(checked) =>
                            handleOutOfStockChange(item, !!checked)
                          }
                          className="w-5 h-5 border-2 border-orange-300 data-[state=checked]:bg-orange-500"
                        />
                        <Label
                          htmlFor={`stock_${item}`}
                          className="text-base font-medium cursor-pointer select-none"
                        >
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4: Additional Notes */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-2xl border-2 border-green-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Additional Notes 📝
                  </h3>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="notes"
                    className="text-lg font-semibold text-gray-700 flex items-center gap-2"
                  >
                    💭 Any additional observations?
                  </Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Share any insights, challenges, or observations you made during your visit..."
                    rows={5}
                    maxLength={200}
                    className="text-lg rounded-xl border-2 border-green-200 focus:border-green-400 focus:ring-green-300 resize-none"
                  />
                  <p className="text-xs text-gray-500 text-right">
                    {notesValue.length}/200 characters
                  </p>
                  <p className="text-sm text-gray-500">
                    This helps us understand the full picture and improve future
                    visits ✨
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center pt-8">
                <Button
                  type="submit"
                  className="w-full md:w-auto px-12 py-6 text-xl font-bold rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-2xl transform hover:scale-105 transition-all duration-300"
                  disabled={
                    submitting || beforeImageUploading || afterImageUploading
                  }
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Sending your amazing work... ✨
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 mr-3" />
                      Submit Merchandising Audit 🎉
                    </>
                  )}
                </Button>

                <div className="mt-6 flex justify-center">
                  <Image
                    src="/images/velma 3d.png"
                    alt="Velma cheering"
                    width={60}
                    height={60}
                    className="animate-bounce"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
