// == IMPORTS & DEPENDENCIES ==
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageFormAddBook, PageFormValues } from "@/components/admin/pageformaddbook";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  ArrowLeft,
  BookOpen,
  Award,
  Image as ImageIcon,
  Settings2,
  Loader2,
  Check,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";

// == ANIMATION PRESETS (UI only) ==
const fadeCard = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const itemFade = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: "easeIn" } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

// == TYPE DEFINITIONS ==
const addBookSchema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    coverImage: z.string().optional(),
    type: z.enum(["storybook", "educational"]),
    subject: z.string().optional(),
    grade: z.string().optional(),
    musicUrl: z.string().optional(),
    quizMode: z.enum(["retry", "straight"]).default("retry"),
  })
  .superRefine((val, ctx) => {
    if (val.type === "educational" && (!val.subject || val.subject.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subject is required for educational books",
        path: ["subject"],
      });
    }
  });

type AddBookFormValues = z.infer<typeof addBookSchema>;

// Badges
type BadgeLite = {
  id: number;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  isActive?: boolean;
  isGeneric?: boolean;
};

type AwardMethod = "auto_on_book_complete" | "manual";

// == HELPERS ==
function getToken() {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem("token");
  return t && t !== "null" ? t : null;
}

async function uploadToCloudinary(
  file: File,
  folder: string,
  kind?: "book_cover" | "page_audio" | "badge_icon"
) {
  const fd = new FormData();
  fd.append("file", file);
  if (kind) fd.append("kind", kind);

  const token = getToken();
  const resp = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) {
    throw new Error(data?.error || "Upload failed");
  }
  return data as { success: true; url: string; publicId: string };
}

function getOptionsList(optionsString?: string): string[] {
  if (!optionsString) return [];
  return optionsString.includes("\n")
    ? optionsString.split("\n").filter((opt) => opt.trim() !== "")
    : optionsString.split(",").map((opt) => opt.trim()).filter((opt) => opt !== "");
}

// == ADD BOOK COMPONENT ==
export default function AddBook() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // toggles/upload states
  const [shuffleAll, setShuffleAll] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);

  // pages
  const [pages, setPages] = useState<PageFormValues[]>([
    { pageNumber: 1, content: "", title: "", imageUrl: "", questions: [] },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number | null>(0);

  // badges
  const [attachBadge, setAttachBadge] = useState(false);
  const [badges, setBadges] = useState<BadgeLite[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  const [useExistingBadge, setUseExistingBadge] = useState(true);
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);

  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDesc, setNewBadgeDesc] = useState("");
  const [newBadgeIconUrl, setNewBadgeIconUrl] = useState("");
  const [badgeIconUploading, setBadgeIconUploading] = useState(false);
  const isGeneric = useMemo(() => !newBadgeIconUrl, [newBadgeIconUrl]);

  const [awardMethod, setAwardMethod] = useState<AwardMethod>("auto_on_book_complete");
  const [threshold, setThreshold] = useState<number>(100);
  const [enableMapping, setEnableMapping] = useState<boolean>(true);

  // form
  const form = useForm<AddBookFormValues>({
    resolver: zodResolver(addBookSchema),
    defaultValues: {
      title: "",
      description: "",
      coverImage: "",
      type: "storybook",
      subject: "",
      grade: "",
      musicUrl: "",
      quizMode: "retry",
    },
  });

  // load badges when needed
  useEffect(() => {
    if (!attachBadge || !useExistingBadge) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingBadges(true);
        const token = getToken();
        const resp = await fetch("/api/badges?active=1", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await resp.json();
        if (resp.ok && data?.badges && mounted) {
          setBadges(data.badges as BadgeLite[]);
        } else if (!resp.ok) {
          throw new Error(data?.message || "Failed to load badges");
        }
      } catch (e: any) {
        toast({
          title: "Failed to load badges",
          description: e?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingBadges(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [attachBadge, useExistingBadge]);

  // mutation
  const mutation = useMutation({
    mutationFn: async (data: AddBookFormValues) => {
      // 1) create book
      const payload = {
        ...data,
        subject: data.type === "educational" ? data.subject ?? null : null,
        quizMode: data.quizMode ?? "retry",
      };
      const bookResponse = await apiRequest("POST", "/api/books", payload);
      if (!bookResponse?.book?.id) throw new Error("Invalid book response from server");
      const bookId = bookResponse.book.id;

      // 2) create pages
      await Promise.all(
        pages.map(async (page) => {
          const pageResponse = await apiRequest("POST", "/api/pages", {
            title: page.title || "",
            content: page.content,
            imageUrl: page.imageUrl || "",
            pageNumber: page.pageNumber,
            bookId,
            shuffleQuestions: shuffleAll,
          });
          if (!pageResponse?.page?.id) {
            throw new Error(`Failed to create page ${page.pageNumber}`);
          }
          const pageId = pageResponse.page.id;

          if (page.questions?.length) {
            const valid = page.questions.filter(
              (q) => q.questionText && q.questionText.trim().length >= 5
            );
            await Promise.all(
              valid.map((q) =>
                apiRequest("POST", "/api/questions", {
                  pageId,
                  questionText: q.questionText,
                  answerType: q.answerType,
                  correctAnswer: q.correctAnswer || "",
                  options: q.options || "",
                })
              )
            );
          }
        })
      );

      // 3) badge attach optional
      if (attachBadge && enableMapping) {
        let badgeIdToUse: number | null = null;

        if (useExistingBadge) {
          if (!selectedBadgeId) throw new Error("Select a badge or choose Create new.");
          badgeIdToUse = selectedBadgeId;
        } else {
          if (!newBadgeName.trim()) throw new Error("Badge name is required.");
          const newBadge = await apiRequest("POST", "/api/badges", {
            name: newBadgeName.trim(),
            description: newBadgeDesc || "",
            iconUrl: newBadgeIconUrl || null,
            isGeneric,
            isActive: true,
          });
          badgeIdToUse = newBadge?.badge?.id;
          if (!badgeIdToUse) throw new Error("Failed to create the new badge.");
        }

        await apiRequest("POST", `/api/books/${bookId}/badges`, {
          badgeId: badgeIdToUse,
          awardMethod,
          completionThreshold:
            awardMethod === "auto_on_book_complete" ? Math.max(1, Math.min(100, threshold)) : 100,
          isEnabled: true,
        });
      }

      return { book: bookResponse.book };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Success!", description: "Book has been added successfully." });
      navigate("/admin/books");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add book. Please try again.",
        variant: "destructive",
      });
    },
  });

  // submit
  const onSubmit = (data: AddBookFormValues) => {
    if (pages.length === 0) {
      toast({ title: "Error", description: "At least one page is required.", variant: "destructive" });
      return;
    }
    const missing = pages.find((p) => !p.content);
    if (missing) {
      toast({
        title: "Error",
        description: `Page ${missing.pageNumber} is missing content.`,
        variant: "destructive",
      });
      setActivePageIndex(missing.pageNumber - 1);
      return;
    }

    // quick question validation
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (p.questions?.length) {
        for (let j = 0; j < p.questions.length; j++) {
          const q = p.questions[j];
          if (!q.questionText || q.questionText.trim().length < 5) {
            toast({
              title: "Invalid Question",
              description: `Question ${j + 1} on page ${p.pageNumber} must be at least 5 characters.`,
              variant: "destructive",
            });
            setActivePageIndex(i);
            return;
          }
        }
      }
    }

    // badge validation
    if (attachBadge) {
      if (useExistingBadge && !selectedBadgeId) {
        toast({
          title: "Badge required",
          description: "Select an existing badge or switch to creating a new one.",
          variant: "destructive",
        });
        return;
      }
      if (!useExistingBadge && !newBadgeName.trim()) {
        toast({
          title: "Badge name required",
          description: "Please enter a name for the new badge.",
          variant: "destructive",
        });
        return;
      }
      if (awardMethod === "auto_on_book_complete" && (threshold < 1 || threshold > 100)) {
        toast({
          title: "Invalid threshold",
          description: "Completion threshold must be between 1 and 100.",
          variant: "destructive",
        });
        return;
      }
    }

    mutation.mutate(data);
  };

  // page management
  const addNewPage = () => {
    const newPageNumber = pages.length + 1;
    setPages([...pages, { pageNumber: newPageNumber, content: "", title: "", imageUrl: "", questions: [] }]);
    setActivePageIndex(newPageNumber - 1);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) {
      toast({ title: "Error", description: "Books must have at least one page.", variant: "destructive" });
      return;
    }
    const updated = [...pages];
    updated.splice(index, 1).filter(Boolean);
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setPages(renumbered);
    setActivePageIndex(null);
  };

  const savePage = (values: PageFormValues, index: number) => {
    if (values.questions?.length) {
      const bad = values.questions.find((q) => !q.questionText || q.questionText.trim().length < 5);
      if (bad) {
        toast({
          title: "Invalid Question",
          description: "Questions must be at least 5 characters long.",
          variant: "destructive",
        });
        return;
      }
    }
    const copy = [...pages];
    copy[index] = values;
    setPages(copy);
    setActivePageIndex(null);
    toast({ title: "Page Saved", description: `Page ${values.pageNumber} content has been saved.` });
  };

  // == RENDER ==
  return (
    <div className="min-h-screen bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      {/* Header Bar */}
      <motion.div
        variants={fadeCard}
        initial="hidden"
        animate="visible"
        className="bg-ilaw-navy text-white"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-ilaw-gold" />
            <span className="text-sm font-heading font-bold text-ilaw-gold">
              ILAW NG BAYAN LEARNING INSTITUTE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              className="h-8 px-3 border-2 border-brand-gold-300 text-ilaw-navy bg-white hover:bg-brand-gold-50"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>
      </motion.div>

      <main className="container mx-auto px-4 py-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {/* LEFT: Book form */}
          <motion.div variants={fadeCard} className="lg:col-span-1">
            <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-sm">
              <div className="border-b border-brand-gold-200 p-4">
                <h3 className="text-lg font-heading font-bold text-ilaw-navy">Create Book</h3>
                <p className="text-[12px] text-brand-gold-700 mt-0.5">Keep fields short and clear.</p>
              </div>

              <div className="p-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} id="book-form" className="space-y-4">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Book title"
                              {...field}
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description shown to students"
                              rows={3}
                              {...field}
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cover (inputs left, compact preview right) */}
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Cover Image</FormLabel>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            {/* inputs */}
                            <div className="sm:col-span-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                  className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      setCoverUploading(true);
                                      const data = await uploadToCloudinary(
                                        file,
                                        "ilaw-ng-bayan/books/covers",
                                        "book_cover"
                                      );
                                      field.onChange(data.url);
                                      toast({ title: "Cover uploaded", description: "Cover image uploaded." });
                                    } catch (err: any) {
                                      toast({
                                        title: "Upload failed",
                                        description: err?.message || "Could not upload cover image.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setCoverUploading(false);
                                    }
                                  }}
                                  disabled={coverUploading}
                                />
                                {!!field.value && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => field.onChange("")}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>

                              <Input
                                placeholder="…or paste an HTTPS/Cloudinary URL"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                              />
                            </div>

                            {/* preview */}
                            <div className="sm:col-span-1">
                              <div className="w-full aspect-[3/4] max-h-44 rounded-lg overflow-hidden border-2 border-brand-gold-200 bg-brand-gold-50 flex items-center justify-center">
                                {field.value ? (
                                  <img src={field.value} alt="Cover preview" className="h-full w-full object-contain" />
                                ) : (
                                  <span className="text-xs text-brand-gold-700">Preview</span>
                                )}
                              </div>
                              <p className="text-[11px] text-center text-brand-gold-700 mt-1">Preview</p>
                            </div>
                          </div>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Type */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Book Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="storybook">📖 Storybook</SelectItem>
                              <SelectItem value="educational">🎓 Educational</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Subject (conditional) */}
                    {form.watch("type") === "educational" && (
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem className="!space-y-1">
                            <FormLabel className="text-ilaw-navy font-heading font-bold">Subject</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Pick subject" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GMRC">GMRC</SelectItem>
                                <SelectItem value="Jolly Phonics (English Reading)">Jolly Phonics (English Reading)</SelectItem>
                                <SelectItem value="Makabansa">Makabansa</SelectItem>
                                <SelectItem value="English (language)">English (language)</SelectItem>
                                <SelectItem value="Mathematics">Mathematics</SelectItem>
                                <SelectItem value="Filipino">Filipino</SelectItem>
                                <SelectItem value="Science">Science</SelectItem>
                                <SelectItem value="English grammar">English grammar</SelectItem>
                                <SelectItem value="Reading comprehension">Reading comprehension</SelectItem>
                                <SelectItem value="Marungko">Marungko</SelectItem>
                                <SelectItem value="MAPEH">MAPEH</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Grade */}
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Grade Level</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="K">🌟 Kindergarten</SelectItem>
                              <SelectItem value="1">1️⃣ Grade 1</SelectItem>
                              <SelectItem value="2">2️⃣ Grade 2</SelectItem>
                              <SelectItem value="3">3️⃣ Grade 3</SelectItem>
                              <SelectItem value="4">4️⃣ Grade 4</SelectItem>
                              <SelectItem value="5">5️⃣ Grade 5</SelectItem>
                              <SelectItem value="6">6️⃣ Grade 6</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quiz + Shuffle row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="quizMode"
                        render={({ field }) => (
                          <FormItem className="!space-y-1">
                            <FormLabel className="text-ilaw-navy font-heading font-bold">Quiz Mode</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retry">🔁 Retry</SelectItem>
                                <SelectItem value="straight">➡️ Straight</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem className="!space-y-1">
                        <FormLabel className="text-ilaw-navy font-heading font-bold">Shuffle Questions</FormLabel>
                        <div className="flex items-center justify-between rounded-md border border-brand-gold-200 px-3 py-2 bg-brand-gold-50">
                          <span className="text-[13px] text-brand-gold-700">Randomize per page</span>
                          <Checkbox checked={shuffleAll} onCheckedChange={(v) => setShuffleAll(Boolean(v))} />
                        </div>
                      </FormItem>
                    </div>

                    {/* Music */}
                    <FormField
                      control={form.control}
                      name="musicUrl"
                      render={({ field }) => (
                        <FormItem className="!space-y-1">
                          <FormLabel className="text-ilaw-navy font-heading font-bold">🎵 Background Music</FormLabel>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="audio/*"
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setAudioUploading(true);
                                  const data = await uploadToCloudinary(
                                    file,
                                    "ilaw-ng-bayan/books/audio",
                                    "page_audio"
                                  );
                                  field.onChange(data.url);
                                  toast({ title: "Audio uploaded", description: "Background music uploaded." });
                                } catch (err: any) {
                                  toast({
                                    title: "Upload failed",
                                    description: err?.message || "Could not upload audio file.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setAudioUploading(false);
                                }
                              }}
                              disabled={audioUploading}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => field.onChange("")}
                                className="text-red-500 hover:text-red-700"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* BADGE SECTION */}
                    <div className="rounded-xl border-2 border-brand-gold-200">
                      <div className="flex items-center justify-between px-3 py-2 bg-brand-gold-50 border-b border-brand-gold-200">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-ilaw-gold" />
                          <span className="font-heading font-bold text-ilaw-navy text-sm">Badge (optional)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-brand-gold-700">Attach</span>
                          <Checkbox checked={attachBadge} onCheckedChange={(v) => setAttachBadge(Boolean(v))} />
                        </div>
                      </div>

                      {attachBadge && (
                        <div className="p-3 space-y-3">
                          {/* toggle existing/new */}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={useExistingBadge ? "default" : "outline"}
                              onClick={() => setUseExistingBadge(true)}
                              className={useExistingBadge ? "h-8 px-3 bg-ilaw-navy text-white" : "h-8 px-3 border-2"}
                            >
                              Existing
                            </Button>
                            <Button
                              type="button"
                              variant={!useExistingBadge ? "default" : "outline"}
                              onClick={() => setUseExistingBadge(false)}
                              className={!useExistingBadge ? "h-8 px-3 bg-ilaw-navy text-white" : "h-8 px-3 border-2"}
                            >
                              Create
                            </Button>
                          </div>

                          {useExistingBadge ? (
                            <div className="space-y-1">
                              <FormLabel className="text-ilaw-navy font-heading font-bold">Select badge</FormLabel>
                              <Select
                                value={selectedBadgeId ? String(selectedBadgeId) : ""}
                                onValueChange={(v) => setSelectedBadgeId(Number(v))}
                              >
                                <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                  <SelectValue placeholder={loadingBadges ? "Loading…" : "Choose badge"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {badges.length ? (
                                    badges.map((b) => (
                                      <SelectItem key={b.id} value={String(b.id)}>
                                        {b.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-brand-gold-700">
                                      {loadingBadges ? "Loading…" : "No active badges found"}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-2">
                                <div className="!space-y-1">
                                  <FormLabel className="text-ilaw-navy font-heading font-bold">Badge name</FormLabel>
                                  <Input
                                    value={newBadgeName}
                                    onChange={(e) => setNewBadgeName(e.target.value)}
                                    placeholder="e.g., Book Finisher"
                                    className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                  />
                                </div>
                                <div className="!space-y-1">
                                  <FormLabel className="text-ilaw-navy font-heading font-bold">
                                    Description (optional)
                                  </FormLabel>
                                  <Textarea
                                    value={newBadgeDesc}
                                    onChange={(e) => setNewBadgeDesc(e.target.value)}
                                    rows={2}
                                    placeholder="Short description"
                                    className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                  />
                                </div>
                                <div className="!space-y-1">
                                  <FormLabel className="text-ilaw-navy font-heading font-bold">Icon (optional)</FormLabel>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          setBadgeIconUploading(true);
                                          const data = await uploadToCloudinary(
                                            file,
                                            "ilaw-ng-bayan/badges/icons",
                                            "badge_icon"
                                          );
                                          setNewBadgeIconUrl(data.url);
                                          toast({ title: "Icon uploaded", description: "Badge icon uploaded." });
                                        } catch (err: any) {
                                          toast({
                                            title: "Upload failed",
                                            description: err?.message || "Could not upload icon.",
                                            variant: "destructive",
                                          });
                                        } finally {
                                          setBadgeIconUploading(false);
                                        }
                                      }}
                                      className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                      disabled={badgeIconUploading}
                                    />
                                    {newBadgeIconUrl && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setNewBadgeIconUrl("")}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                  {newBadgeIconUrl ? (
                                    <div className="mt-1 rounded-md overflow-hidden border border-brand-gold-200 bg-brand-gold-50 p-2">
                                      <img src={newBadgeIconUrl} alt="Badge icon" className="w-full h-20 object-contain" />
                                    </div>
                                  ) : (
                                    <div className="text-[12px] text-brand-gold-700 flex items-center gap-1">
                                      <ImageIcon className="h-4 w-4" />
                                      No icon selected — generic style will be used.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Award Rules */}
                          <div className="rounded-md border border-brand-gold-200">
                            <div className="px-3 py-2 bg-brand-gold-50 border-b border-brand-gold-200 flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-ilaw-gold" />
                              <span className="font-heading font-bold text-ilaw-navy text-sm">Award Rules</span>
                            </div>
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="!space-y-1">
                                <FormLabel className="text-ilaw-navy font-heading font-bold">Method</FormLabel>
                                <Select value={awardMethod} onValueChange={(v) => setAwardMethod(v as AwardMethod)}>
                                  <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                    <SelectValue placeholder="Method" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto_on_book_complete">Auto on completion</SelectItem>
                                    <SelectItem value="manual">Manual (teacher awards)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="!space-y-1">
                                <FormLabel className="text-ilaw-navy font-heading font-bold">Threshold (%)</FormLabel>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={threshold}
                                  disabled={awardMethod !== "auto_on_book_complete"}
                                  onChange={(e) => setThreshold(Number(e.target.value || 100))}
                                  className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                />
                              </div>
                              <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-brand-gold-200 px-3 py-2 bg-white">
                                <span className="text-[13px] text-brand-gold-700">Enable this badge for this book</span>
                                <Checkbox checked={enableMapping} onCheckedChange={(v) => setEnableMapping(Boolean(v))} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Pages */}
          <motion.div variants={fadeCard} className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading font-bold text-ilaw-navy">Pages</h2>
              <Button
                onClick={addNewPage}
                className="h-9 bg-gradient-to-r from-brand-gold-500 to-ilaw-gold hover:from-ilaw-gold hover:to-brand-gold-600 text-white font-heading font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {pages.map((page, index) => (
                <motion.div
                  key={index}
                  variants={itemFade}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {activePageIndex === index ? (
                    <PageFormAddBook
                      initialValues={page}
                      pageNumber={page.pageNumber}
                      onSave={(values) => savePage(values, index)}
                      onRemove={() => removePage(index)}
                      showRemoveButton={pages.length > 1}
                    />
                  ) : (
                    <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
                      {/* Header */}
                      <div className="border-b border-brand-gold-200 p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-heading font-bold text-ilaw-navy">
                            📄 Page {page.pageNumber}
                            {page.title && `: ${page.title}`}
                          </span>
                          <div className="flex items-center gap-2">
                            {shuffleAll && (
                              <span className="text-[11px] bg-brand-gold-100 text-ilaw-navy px-2 py-0.5 rounded-full font-bold">
                                🔀 Shuffled
                              </span>
                            )}
                            {page.questions?.length ? (
                              <span className="text-[12px] bg-ilaw-navy text-white px-2 py-0.5 rounded-full font-bold">
                                ❓ {page.questions.length}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Expanded PREVIEW (image + content + Q&A) */}
                      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Image */}
                        {page.imageUrl ? (
                          <div className="md:col-span-1">
                            <div className="aspect-video rounded-lg overflow-hidden bg-brand-gold-50 border-2 border-brand-gold-200">
                              <img
                                src={page.imageUrl}
                                alt={page.title || `Page ${page.pageNumber}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        ) : null}

                        {/* Content + Questions */}
                        <div className={page.imageUrl ? "md:col-span-2 space-y-3" : "md:col-span-3 space-y-3"}>
                          {/* Content */}
                          <div className="rounded-lg border border-brand-gold-200 p-3 bg-brand-gold-50">
                            <div className="text-[12px] font-semibold text-brand-gold-700 mb-1">Page Content</div>
                            <p className="text-sm text-ilaw-navy whitespace-pre-line line-clamp-6">
                              {page.content || <em className="text-gray-400">No content yet</em>}
                            </p>
                          </div>

                          {/* Questions */}
                          {page.questions && page.questions.length > 0 && (
                            <div className="rounded-lg border border-brand-gold-200 p-3">
                              <div className="text-[12px] font-semibold text-brand-gold-700 mb-2">
                                Questions & Answers
                              </div>

                              <div className="space-y-3">
                                {page.questions.map((q, qi) => {
                                  const options = getOptionsList(q.options);
                                  const isMC = q.answerType === "multiple_choice";
                                  return (
                                    <div key={qi} className="border border-brand-gold-200 rounded-md p-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="text-sm font-semibold text-ilaw-navy">
                                          {qi + 1}. {q.questionText}
                                        </div>
                                        <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border font-bold ${isMC ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                          {isMC ? "Multiple choice" : "Text"}
                                        </span>
                                      </div>

                                      {isMC ? (
                                        <ul className="mt-2 space-y-1">
                                          {options.map((opt, oi) => {
                                            const correct = q.correctAnswer === opt;
                                            return (
                                              <li
                                                key={oi}
                                                className={`text-sm flex items-center gap-2 rounded px-2 py-1 ${
                                                  correct
                                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                                    : "bg-white border border-brand-gold-100 text-ilaw-navy"
                                                }`}
                                              >
                                                {correct ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
                                                <span>{opt}</span>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      ) : (
                                        <div className="mt-2 text-sm">
                                          <span className="text-brand-gold-700 font-semibold">Correct answer: </span>
                                          <span className="text-ilaw-navy">{q.correctAnswer || <em>—</em>}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="border-t border-brand-gold-200 p-3">
                        <Button
                          variant="secondary"
                          className="w-full bg-brand-gold-100 hover:bg-brand-gold-200 text-ilaw-navy font-heading font-bold border-2 border-brand-gold-300"
                          onClick={() => setActivePageIndex(index)}
                        >
                          ✏️ Edit Page
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Sticky action bar */}
        <motion.div
          variants={fadeCard}
          initial="hidden"
          animate="visible"
          className="sticky bottom-4 mt-6"
        >
          <div className="max-w-6xl mx-auto">
            <div className="rounded-xl border-2 border-brand-gold-300 bg-white/90 backdrop-blur p-3 shadow-lg flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/books")}
                className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="book-form"
                disabled={mutation.isPending || coverUploading || audioUploading || badgeIconUploading}
                className="min-w-[140px] bg-gradient-to-r from-brand-gold-500 to-ilaw-gold hover:from-ilaw-gold hover:to-brand-gold-600 text-white font-heading font-bold"
              >
                {(mutation.isPending || coverUploading || audioUploading || badgeIconUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                ✨ Add Book
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}