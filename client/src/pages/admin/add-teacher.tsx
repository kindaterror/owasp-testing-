// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, GraduationCap, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// == TYPE DEFINITIONS ==
const teacherFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  username: z.string().min(4, {
    message: "Username must be at least 4 characters.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// == ADD TEACHER COMPONENT ==
export default function AddTeacher() {
  
  // == HOOKS & STATE ==
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // == FORM INITIALIZATION ==
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // == TEACHER CREATION MUTATION ==
  const addTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormValues) => {
      const { confirmPassword, ...teacherData } = data;
      
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...teacherData,
          role: "teacher",
          status: "approved"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add teacher");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher added successfully",
      });
      navigate("/admin/teacher");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add teacher",
      });
      setIsSubmitting(false);
    }
  });

  // == FORM SUBMISSION ==
  const onSubmit = async (data: TeacherFormValues) => {
    setIsSubmitting(true);
    addTeacherMutation.mutate(data);
  };

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />
      
      <main className="flex-grow p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* == Header Section == */}
          <div className="text-center mb-8">
            <div className="bg-ilaw-navy rounded-2xl p-6 text-white shadow-xl mb-6">
              <div className="flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
                <span className="text-lg font-heading font-bold text-ilaw-gold">ILAW NG BAYAN LEARNING INSTITUTE</span>
              </div>
              <h1 className="text-3xl font-heading font-bold mb-2">Add New Teacher 👩‍🏫</h1>
              <p className="text-lg text-blue-100">Expand our educational team with qualified educators</p>
            </div>
            
            <div className="flex justify-center">
              <Link href="/admin/teacher">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold flex items-center"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Teachers
                </Button>
              </Link>
            </div>
          </div>
          
          {/* == Teacher Form == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
            
            {/* == Form Header == */}
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy flex items-center">
                <UserPlus className="h-6 w-6 text-ilaw-gold mr-2" />
                Teacher Information
              </h3>
              <p className="text-brand-gold-600 mt-1 font-medium">Enter the details for the new teacher account</p>
            </div>

            {/* == Form Content == */}
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* == Name Fields == */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="First name" 
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Last name" 
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* == Email Field == */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ilaw-navy font-heading font-bold">📧 Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Email address" 
                            {...field} 
                            className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* == Username Field == */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ilaw-navy font-heading font-bold">👤 Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Username" 
                            {...field} 
                            className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* == Password Fields == */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">🔒 Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Password" 
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">🔒 Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm password" 
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* == Form Actions == */}
                  <div className="flex justify-end space-x-4 pt-4 border-t-2 border-brand-gold-200">
                    <Link href="/admin/teacher">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-heading font-bold"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-ilaw-navy to-ilaw-navy-600 hover:from-ilaw-navy-600 hover:to-ilaw-navy-700 text-white font-heading font-bold px-8"
                    >
                      {isSubmitting ? "⏳ Adding..." : "✨ Add Teacher"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}