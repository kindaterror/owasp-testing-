// == IMPORTS & DEPENDENCIES ==
import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Upload, X, Image, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { motion, AnimatePresence } from 'framer-motion';

/** ================= Cloudinary helpers (Vite + Next-safe) ================= */
const cloud =
  ((typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined)
    ?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  ((typeof globalThis !== 'undefined'
    ? (globalThis as any).NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    : undefined) as string | undefined) ||
  ((typeof process !== 'undefined' ? (process as any).env : undefined)
    ?.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  ((typeof process !== 'undefined' ? (process as any).env : undefined)
    ?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  '';

const clUrl = (publicId?: string, w = 800, h = 450) => {
  if (!publicId || !cloud) return '';
  return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,w=${w},h=${h},q_auto,f_auto/${publicId}`;
};

// == TYPE DEFINITIONS ==
export interface Question {
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

const pageSchema = z.object({
  pageNumber: z.coerce.number().min(1, 'Page number is required'),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  imageUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
});

export interface PageFormValues extends z.infer<typeof pageSchema> {
  id?: number;
  questions?: Question[];
  showNotification?: boolean;
}

interface PageFormProps {
  initialValues?: PageFormValues;
  pageNumber: number;
  onSave: (values: PageFormValues) => void;
  onRemove: () => void;
  showRemoveButton?: boolean;
}

// == Motion presets (UI-only) ==
const fadeCard = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const sectionFade = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const itemFade = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// == PAGE FORM COMPONENT ==
export function PageForm({
  initialValues,
  pageNumber,
  onSave,
  onRemove,
  showRemoveButton = true
}: PageFormProps) {

  // == State & Refs ==
  const { toast } = useToast();
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(initialValues?.questions || []);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastQuestionsChange, setLastQuestionsChange] = useState(0);
  const [lastImageChange, setLastImageChange] = useState(0);

  // == Effects ==
  useEffect(() => {
    if (initialValues?.questions && initialValues.questions.length > 0) {
      setQuestions(initialValues.questions);
      setHasQuestions(true);
    }
    setTimeout(() => setIsInitialLoad(false), 1000);
  }, [initialValues?.questions]);

  // == Form Initialization ==
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialValues || {
      pageNumber,
      title: '',
      content: '',
      imageUrl: '',
      imagePublicId: '',
    },
  });

  // Prefer Cloudinary preview if a publicId is present
  const cloudPublicId = form.watch('imagePublicId');
  const computedPreview = cloudPublicId ? clUrl(cloudPublicId) : imagePreview;

  // == Auto-Save: Content Changes ==
  useEffect(() => {
    const subscription = form.watch((values, { type }) => {
      if (isInitialLoad) return;

      if (values.content && values.content.trim() && (type === 'change')) {
        setHasUnsavedChanges(true);

        const pageData: PageFormValues = {
          ...values,
          pageNumber,
          questions: questions.length > 0 ? questions : undefined,
          showNotification: false
        };

        const timeoutId = setTimeout(() => {
          onSave(pageData);
          setHasUnsavedChanges(false);
        }, 1200);

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, pageNumber, questions, onSave, isInitialLoad, hasUnsavedChanges]);

  // == Auto-Save: Question Changes ==
  useEffect(() => {
    if (isInitialLoad) return;

    const formValues = form.getValues();
    if (formValues.content && formValues.content.trim()) {
      setHasUnsavedChanges(true);

      const now = Date.now();
      const shouldShowNotification = now - lastQuestionsChange < 500;

      const pageData: PageFormValues = {
        ...formValues,
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: shouldShowNotification
      };

      const timeoutId = setTimeout(() => {
        onSave(pageData);
        setHasUnsavedChanges(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [questions, form, pageNumber, onSave, isInitialLoad, hasUnsavedChanges, lastQuestionsChange]);

  // == Image Handling ==
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      setImagePreview(dataUrl);
      form.setValue("imageUrl", dataUrl);
      setHasUnsavedChanges(true);
      setLastImageChange(Date.now());

      const formValues = form.getValues();
      const pageData: PageFormValues = {
        ...formValues,
        imageUrl: dataUrl,
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: true
      };

      setTimeout(() => {
        onSave(pageData);
        setHasUnsavedChanges(false);
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    setHasUnsavedChanges(true);
    setLastImageChange(Date.now());

    const formValues = form.getValues();
    const pageData: PageFormValues = {
      ...formValues,
      imageUrl: "",
      pageNumber,
      questions: questions.length > 0 ? questions : undefined,
      showNotification: true
    };

    setTimeout(() => {
      onSave(pageData);
      setHasUnsavedChanges(false);
    }, 500);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // == Question Utilities ==
  const getOptionsList = (optionsString?: string): string[] => {
    if (!optionsString) return [];
    return optionsString.includes('\n')
      ? optionsString.split('\n').filter(opt => opt.trim() !== '')
      : optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
  };

  // == Question Management ==
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', answerType: 'text', correctAnswer: '', options: '' }
    ]);
    setHasQuestions(true);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
    if (updated.length === 0) setHasQuestions(false);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'answerType' && value === 'multiple_choice') {
      const current = updated[index];
      const opts = getOptionsList(current.options);
      if (opts.length === 0) current.options = "Option 1\nOption 2\nOption 3";
    }

    setQuestions(updated);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };

  // == Option Management ==
  const addOption = (qi: number) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options || '');
    const optionsString = [...opts, `Option ${opts.length + 1}`].join('\n');
    updateQuestion(qi, 'options', optionsString);
  };

  const removeOption = (qi: number, oi: number) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options);
    if (q.correctAnswer === opts[oi]) updateQuestion(qi, 'correctAnswer', '');
    const next = opts.slice(0, oi).concat(opts.slice(oi + 1)).join('\n');
    updateQuestion(qi, 'options', next);
  };

  const updateOptionText = (qi: number, oi: number, text: string) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options);
    if (q.correctAnswer === opts[oi]) updateQuestion(qi, 'correctAnswer', text);
    opts[oi] = text;
    updateQuestion(qi, 'options', opts.join('\n'));
  };

  // == Render Component ==
  return (
    <motion.div
      variants={fadeCard}
      initial="hidden"
      animate="visible"
      className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-5"
    >
      {/* == Page Header == */}
      <div className="border-b border-brand-gold-200 p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
            <Sparkles className="h-5 w-5 text-ilaw-gold mr-2" />
            📄 Page {pageNumber}
            {hasUnsavedChanges && !isInitialLoad && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-2 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium"
              >
                • Unsaved
              </motion.span>
            )}
          </h3>
          {showRemoveButton && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="bg-red-500 hover:bg-red-600 text-white font-heading font-bold"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Page
            </Button>
          )}
        </div>
      </div>

      {/* == Form Content == */}
      <div className="p-4">
        <Form {...form}>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">

            {/* Hidden field for Cloudinary ID */}
            <FormField control={form.control} name="imagePublicId" render={({ field }) => (<input type="hidden" {...field} />)} />

            {/* === Top Grid: fields (2 cols) + image (1 col) === */}
            <motion.div variants={sectionFade} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Left: fields */}
              <div className="md:col-span-2 flex flex-col gap-4 md:h-full">
                {/* Title */}
                <motion.div variants={itemFade}>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="!space-y-1">
                        <FormLabel className="text-ilaw-navy font-heading font-bold">Page Title (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a title for this page"
                            {...field}
                            value={field.value || ''}
                            className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Content */}
                <motion.div variants={itemFade}>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="!space-y-1 flex-1 flex flex-col">
                        <FormLabel className="text-ilaw-navy font-heading font-bold">Page Content</FormLabel>
                        <FormControl className="flex-1 flex">
                          <Textarea
                            placeholder="Enter the content for this page..."
                            {...field}
                            className="border-2 border-brand-gold-200 focus:border-ilaw-gold flex-1 h-full min-h-[260px] md:min-h-0 resize-vertical md:resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </div>

              {/* Right: image panel */}
              <motion.div variants={itemFade} className="md:col-span-1 space-y-3">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-ilaw-navy font-heading font-bold">🖼️ Page Image</FormLabel>
                      <div className="space-y-3">
                        {/* Preview */}
                        <AnimatePresence initial={false} mode="popLayout">
                          {computedPreview ? (
                            <motion.div
                              key="img-preview"
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              className="relative w-full"
                            >
                              <div className="relative aspect-[3/4] bg-brand-gold-50 rounded-xl overflow-hidden border-2 border-brand-gold-200">
                                <img
                                  src={computedPreview}
                                  alt="Page image preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 hover:bg-red-600"
                                  onClick={clearImage}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="img-drop"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-brand-gold-300 rounded-xl bg-brand-gold-50"
                            >
                              <Image className="h-7 w-7 text-brand-gold-600 mb-2" />
                              <p className="text-sm text-brand-gold-600 font-medium mb-2">Upload an image for this page</p>
                              <div className="flex items-center space-x-2">
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
                                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Choose Image
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* URL input */}
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="Or enter image URL"
                              {...field}
                              value={field.value || ''}
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                              onChange={(e) => {
                                field.onChange(e);
                                setLastImageChange(Date.now());
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-brand-gold-600 font-medium">
                            You can upload OR paste a URL
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>
            </motion.div>

            {/* == Questions Section == */}
            <motion.div variants={sectionFade} className="pt-5 border-t-2 border-brand-gold-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-bold text-ilaw-navy flex items-center">
                  ❓ Questions
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {questions.map((question, index) => (
                  <motion.div
                    key={index}
                    variants={itemFade}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-4 border-2 border-brand-gold-200 rounded-xl mb-3 bg-brand-gold-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-base font-heading font-bold text-ilaw-navy">❓ Question {index + 1}</h4>
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
                        <Label className="text-ilaw-navy font-heading font-bold">Question Text</Label>
                        <Textarea
                          value={question.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          placeholder="Enter your question here..."
                          className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="text-ilaw-navy font-heading font-bold">Answer Type</Label>
                        <select
                          value={question.answerType}
                          onChange={(e) => updateQuestion(index, 'answerType', e.target.value)}
                          className="w-full mt-1 p-2 border-2 border-brand-gold-200 rounded-lg focus:border-ilaw-gold font-medium"
                        >
                          <option value="text">✍️ Text</option>
                          <option value="multiple_choice">🔘 Multiple Choice</option>
                        </select>
                      </div>

                      <AnimatePresence initial={false} mode="popLayout">
                        {question.answerType === 'text' && (
                          <motion.div
                            key={`text-${index}`}
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <Label className="text-ilaw-navy font-heading font-bold">Correct Answer</Label>
                            <Input
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                              placeholder="Enter the correct answer"
                              className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </motion.div>
                        )}

                        {question.answerType === 'multiple_choice' && (
                          <motion.div
                            key={`mc-${index}`}
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <Label className="text-ilaw-navy font-heading font-bold">Options</Label>
                            <div className="border-2 border-brand-gold-200 rounded-xl mt-1 bg-white">
                              {getOptionsList(question.options).map((option, optionIdx) => (
                                <div key={optionIdx} className="flex items-center p-3 border-b border-brand-gold-200 last:border-b-0">
                                  <input
                                    type="radio"
                                    id={`question-${index}-option-${optionIdx}`}
                                    name={`question-${index}-correct`}
                                    className="mr-3 h-4 w-4 text-ilaw-gold"
                                    checked={question.correctAnswer === option}
                                    onChange={() => updateQuestion(index, 'correctAnswer', option)}
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

                              <div className="p-3">
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
                            <p className="text-xs text-brand-gold-600 mt-1 font-medium">
                              Select the radio button next to the correct answer
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {questions.length === 0 && (
                <motion.p
                  variants={itemFade}
                  initial="hidden"
                  animate="visible"
                  className="text-sm text-brand-gold-600 italic font-medium text-center p-4 bg-brand-gold-50 rounded-xl border-2 border-brand-gold-200"
                >
                  No questions added yet. Click 'Add Question' to add interactive questions to this page.
                </motion.p>
              )}
            </motion.div>

            {/* == Auto-Save Status == */}
            <motion.div variants={sectionFade} className="pt-5 border-t-2 border-brand-gold-200">
              <div className="bg-gradient-to-r from-brand-gold-50 to-brand-navy-50/40 border-2 border-brand-gold-200 rounded-xl p-3 text-center">
                <p className="text-sm text-ilaw-navy font-medium flex items-center justify-center">
                  <Sparkles className="h-4 w-4 mr-2 text-ilaw-gold" />
                  ✨ Changes save automatically. Click "Save Changes" at the bottom to update the book.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </Form>
      </div>
    </motion.div>
  );
}