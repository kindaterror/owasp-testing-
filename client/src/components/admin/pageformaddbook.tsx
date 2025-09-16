// == IMPORTS & DEPENDENCIES ==
import React, { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Upload, X, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// == TYPE DEFINITIONS ==
export interface Question {
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

const pageSchema = z.object({
  pageNumber: z.coerce.number().min(1, "Page number is required"),
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().optional(),
});

export interface PageFormValues extends z.infer<typeof pageSchema> {
  id?: number;
  questions?: Question[];
}

interface PageFormProps {
  initialValues?: PageFormValues;
  pageNumber: number;
  onSave: (values: PageFormValues) => void;
  onRemove: () => void;
  showRemoveButton?: boolean;
}

// == HELPERS ==
const getToken = () => {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem("token");
  return t && t !== "null" ? t : null;
};

// Upload via our API (for Cloudinary)
async function uploadImage(file: File, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", "page_image");

  const token = getToken();
  const resp = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  const data = await resp.json();
  if (!resp.ok || !data?.success) {
    throw new Error(data?.error || "Image upload failed");
  }

  return data as { success: true; url: string; publicId: string };
}

// == PAGE FORM COMPONENT ==
export function PageFormAddBook({
  initialValues,
  pageNumber,
  onSave,
  onRemove,
  showRemoveButton = true,
}: PageFormProps) {
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>(initialValues?.questions || []);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValues?.questions?.length) {
      setQuestions(initialValues.questions);
    }
  }, [initialValues?.questions]);

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialValues || {
      pageNumber,
      title: "",
      content: "",
      imageUrl: "",
    },
  });

  // == Image ==
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size should be less than 5MB", variant: "destructive" });
      return;
    }

    try {
      setImageUploading(true);
      const { url } = await uploadImage(file, "ilaw-ng-bayan/pages/images");
      form.setValue("imageUrl", url, { shouldDirty: true });
      setImagePreview(url);
      toast({ title: "Image uploaded", description: "Page image uploaded successfully." });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload image.",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // == Questions helpers ==
  const getOptionsList = (optionsString?: string): string[] => {
    if (!optionsString) return [];
    return optionsString.includes("\n")
      ? optionsString.split("\n").filter((opt) => opt.trim() !== "")
      : optionsString
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt !== "");
  };

  const addQuestion = () => {
    setQuestions((q) => [...q, { questionText: "", answerType: "text", correctAnswer: "", options: "" }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((q) => q.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    setQuestions((q) => {
      const next = [...q];
      next[index] = { ...next[index], [field]: value };

      if (field === "answerType" && value === "multiple_choice") {
        const opts = getOptionsList(next[index].options);
        if (opts.length === 0) next[index].options = "Option 1\nOption 2\nOption 3";
      }
      return next;
    });
  };

  // options
  const addOption = (qi: number) => {
    const opts = getOptionsList(questions[qi].options || "");
    updateQuestion(qi, "options", [...opts, `Option ${opts.length + 1}`].join("\n"));
  };
  const removeOption = (qi: number, oi: number) => {
    const opts = getOptionsList(questions[qi].options);
    if (questions[qi].correctAnswer === opts[oi]) updateQuestion(qi, "correctAnswer", "");
    updateQuestion(qi, "options", opts.filter((_, i) => i !== oi).join("\n"));
  };
  const updateOptionText = (qi: number, oi: number, text: string) => {
    const opts = getOptionsList(questions[qi].options);
    if (questions[qi].correctAnswer === opts[oi]) updateQuestion(qi, "correctAnswer", text);
    const next = [...opts];
    next[oi] = text;
    updateQuestion(qi, "options", next.join("\n"));
  };

  // submit to parent
  const handleSubmit = (values: PageFormValues) => {
    onSave({ ...values, pageNumber, questions: questions.length ? questions : undefined });
  };

  return (
    <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-sm">
      {/* Header */}
      <div className="border-b border-brand-gold-200 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-heading font-bold text-ilaw-navy flex items-center">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-ilaw-gold mr-2" />
            Page {pageNumber}
          </h3>
          {showRemoveButton && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="h-8 bg-red-500 hover:bg-red-600 text-white font-heading font-bold"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Top grid: fields + image */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* fields */}
              <div className="md:col-span-2 space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="!space-y-1">
                      <FormLabel className="text-ilaw-navy font-heading font-bold">Page Title (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a title for this page"
                          {...field}
                          value={field.value || ""}
                          className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="!space-y-1">
                      <FormLabel className="text-ilaw-navy font-heading font-bold">Page Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the content for this page..."
                          rows={6}
                          {...field}
                          className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* image */}
              <div className="md:col-span-1 space-y-2">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="!space-y-1">
                      <FormLabel className="text-ilaw-navy font-heading font-bold">Page Image</FormLabel>

                      {imagePreview ? (
                        <div className="relative">
                          <div className="aspect-[3/4] bg-brand-gold-50 rounded-lg overflow-hidden border-2 border-brand-gold-200">
                            <img src={imagePreview} alt="Page image preview" className="w-full h-full object-cover" />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 hover:bg-red-600"
                            onClick={clearImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-brand-gold-300 rounded-lg bg-brand-gold-50">
                          <ImageIcon className="h-6 w-6 text-brand-gold-600 mb-2" />
                          <p className="text-xs text-brand-gold-600 font-medium mb-2">Upload an image</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            id={`image-upload-${pageNumber}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={imageUploading}
                          >
                            {imageUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading…
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                Choose
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      <FormControl>
                        <Input
                          placeholder="…or paste image URL"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setImagePreview(e.target.value || null);
                          }}
                          className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                        />
                      </FormControl>
                      <FormDescription className="text-[12px] text-brand-gold-700">
                        Upload or paste a direct HTTPS/Cloudinary URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="pt-3 border-t-2 border-brand-gold-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-heading font-bold text-ilaw-navy">Questions</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="h-8 border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>

              {questions.map((question, index) => (
                <div key={index} className="p-3 border-2 border-brand-gold-200 rounded-lg mb-3 bg-brand-gold-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-heading font-bold text-ilaw-navy">❓ Question {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-ilaw-navy font-heading font-bold text-sm">Question Text</Label>
                      <Textarea
                        value={question.questionText}
                        onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
                        placeholder="Enter your question here…"
                        rows={3}
                        className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-ilaw-navy font-heading font-bold text-sm">Answer Type</Label>
                        <select
                          value={question.answerType}
                          onChange={(e) => updateQuestion(index, "answerType", e.target.value)}
                          className="w-full mt-1 p-2 border-2 border-brand-gold-200 rounded-lg focus:border-ilaw-gold font-medium"
                        >
                          <option value="text">✍️ Text</option>
                          <option value="multiple_choice">🔘 Multiple Choice</option>
                        </select>
                      </div>

                      {question.answerType === "text" && (
                        <div>
                          <Label className="text-ilaw-navy font-heading font-bold text-sm">Correct Answer</Label>
                          <Input
                            value={question.correctAnswer || ""}
                            onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value)}
                            placeholder="Enter the correct answer"
                            className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                          />
                        </div>
                      )}
                    </div>

                    {question.answerType === "multiple_choice" && (
                      <div>
                        <Label className="text-ilaw-navy font-heading font-bold text-sm">Options</Label>
                        <div className="border-2 border-brand-gold-200 rounded-lg mt-1 bg-white">
                          {getOptionsList(question.options).map((option, optionIdx) => (
                            <div key={optionIdx} className="flex items-center p-2.5 border-b border-brand-gold-200 last:border-b-0">
                              <input
                                type="radio"
                                id={`q${index}-opt${optionIdx}`}
                                name={`question-${index}-correct`}
                                className="mr-3 h-4 w-4 text-ilaw-gold"
                                checked={question.correctAnswer === option}
                                onChange={() => updateQuestion(index, "correctAnswer", option)}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOptionText(index, optionIdx, e.target.value)}
                                className="flex-1 border-0 focus:ring-0 p-1 font-medium text-ilaw-navy"
                                placeholder={`Option ${optionIdx + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeOption(index, optionIdx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addOption(index)}
                              className="w-full justify-center border-2 border-dashed border-brand-gold-300 text-brand-gold-600 hover:bg-brand-gold-100 font-bold"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                        <p className="text-[12px] text-brand-gold-600 mt-1 font-medium">
                          Select the radio next to the correct answer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {!questions.length && (
                <p className="text-sm text-brand-gold-600 italic font-medium text-center p-3 bg-brand-gold-50 rounded-lg border-2 border-brand-gold-200">
                  No questions yet. Click “Add Question” to include one.
                </p>
              )}
            </div>

            {/* Save */}
            <div className="pt-3 border-t-2 border-brand-gold-200">
              <Button
                type="submit"
                className="w-full h-11 bg-ilaw-gold hover:bg-ilaw-gold/90 text-ilaw-navy font-heading font-bold"
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Save Page
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
