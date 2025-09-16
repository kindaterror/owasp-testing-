// src/pages/admin/teacher.tsx

// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  CheckCircle,
  XCircle,
  GraduationCap,
  Users,
  UserCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AvatarImg } from "@/components/ui/media";

// ✨ animations
import { motion, AnimatePresence } from "framer-motion";

// == TYPES ==
type Teacher = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  createdAt?: string;
  avatar?: string | null;          // may be null
  rejectionReason?: string | null; // for rejected tab
};

type TeachersResponse = {
  teachers: Teacher[];
};

// simple variants reused across sections
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// == ADMIN TEACHER COMPONENT ==
export default function AdminTeacher() {
  // == HOOKS & STATE ==
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"approved" | "pending" | "rejected">("approved");

  // == DATA FETCHING ==
  const { data: teachersData, isLoading } = useQuery<TeachersResponse>({
    queryKey: ["teachers", activeTab, searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/teachers?status=${activeTab}${
          searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  const { data: pendingTeachersData } = useQuery<TeachersResponse>({
    queryKey: ["teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending teachers");
      return response.json();
    },
  });

  // == MUTATIONS ==
  const approveMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const response = await fetch(`/api/teachers/${teacherId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to approve teacher: ${response.status} ${response.statusText} ${errorText || ""}`
        );
      }
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Success",
        description: "Teacher account has been approved",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to approve teacher account",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ teacherId, reason }: { teacherId: number; reason: string }) => {
      const response = await fetch(`/api/teachers/${teacherId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to reject teacher: ${response.status} ${response.statusText} ${errorText || ""}`
        );
      }
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      toast({
        title: "Success",
        description: "Teacher account has been rejected",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to reject teacher account",
        variant: "destructive",
      });
    },
  });

  // == EVENT HANDLERS ==
  const handleApproveTeacher = (teacherId: number) => approveMutation.mutate(teacherId);
  const handleRejectTeacher = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setIsRejectDialogOpen(true);
  };
  const handleRejectSubmit = () => {
    if (selectedTeacherId !== null) {
      rejectMutation.mutate({ teacherId: selectedTeacherId, reason: rejectionReason });
    }
  };

  // == COMPUTED VALUES ==
  const pendingCount = pendingTeachersData?.teachers?.length || 0;
  const teachers: Teacher[] = teachersData?.teachers ?? [];

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />

      {/* == Header (matches dashboard look) == */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-ilaw-navy text-white py-6"
      >
        <div className="container mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center mb-2"
          >
            <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
            <span className="text-lg font-heading font-bold text-ilaw-gold">
              ILAW NG BAYAN LEARNING INSTITUTE
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-3xl font-heading font-bold text-center"
          >
            👨‍🏫 Teacher Management
          </motion.h1>
          <motion.p
            variants={fade}
            initial="hidden"
            animate="visible"
            className="text-lg text-blue-100 text-center"
          >
            Manage educator accounts and approvals
          </motion.p>
        </div>
      </motion.div>

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* == Back == */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold mt-2 md:mt-0"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* == Search == */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-8"
          >
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Users className="h-6 w-6 text-ilaw-gold mr-2" />
                🔍 Search Teachers
              </h3>
            </div>
            <div className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold-500" size={18} />
                <Input
                  placeholder="Search teachers..."
                  className="pl-10 border-2 border-brand-gold-200 focus:border-ilaw-gold focus:shadow-[0_0_0_4px_rgba(251,191,36,0.15)] transition-shadow"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          {/* == Directory == */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg"
          >
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <UserCheck className="h-6 w-6 text-ilaw-gold mr-2" />
                👨‍🏫 Teacher Directory
              </h3>
            </div>

            <div className="pt-6 px-6 pb-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <Tabs
                    defaultValue="approved"
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                    className="space-y-4"
                  >
                    <TabsList className="grid grid-cols-3 bg-brand-gold-100 rounded-xl">
                      <TabsTrigger
                        value="approved"
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        ✅ Approved Teachers
                      </TabsTrigger>
                      <TabsTrigger
                        value="pending"
                        className="relative font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        ⏳ Pending Approval
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-2 absolute -top-2 -right-2">
                            {pendingCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="rejected"
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        ❌ Rejected
                      </TabsTrigger>
                    </TabsList>

                    {/* == Approved == */}
                    <TabsContent value="approved" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-brand-gold-200">
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  👨‍🏫 Loading teachers...
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  👨‍🏫 No approved teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors"
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border-2 border-brand-gold-200"
                                        />
                                      </div>
                                      <div>
                                        <div className="font-heading font-bold text-ilaw-navy">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-sm text-yellow-600 font-medium">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.email}</TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.username}</TableCell>
                                  <TableCell className="text-yellow-600 font-medium">
                                    {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-600 hover:bg-red-50 font-bold"
                                          onClick={() => handleRejectTeacher(teacher.id)}
                                          disabled={rejectMutation.isPending}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          ❌ Reject
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* == Pending == */}
                    <TabsContent value="pending" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-brand-gold-200">
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  ⏳ Loading pending teachers...
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  ⏳ No pending teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors"
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border-2 border-brand-gold-200"
                                        />
                                      </div>
                                      <div>
                                        <div className="font-heading font-bold text-ilaw-navy">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-sm text-yellow-600 font-medium">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.email}</TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.username}</TableCell>
                                  <TableCell className="text-yellow-600 font-medium">
                                    {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                          onClick={() => handleApproveTeacher(teacher.id)}
                                          disabled={approveMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          {approveMutation.isPending ? "Approving..." : "✅ Approve"}
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center text-red-600 border-red-600 hover:bg-red-50 font-bold"
                                          onClick={() => handleRejectTeacher(teacher.id)}
                                          disabled={rejectMutation.isPending}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          ❌ Reject
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* == Rejected == */}
                    <TabsContent value="rejected" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-brand-gold-200">
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy">❌ Rejection Reason</TableHead>
                              <TableHead className="font-heading font-bold text-ilaw-navy text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  ❌ Loading rejected teachers...
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                                  ❌ No rejected teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors"
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border-2 border-brand-gold-200"
                                        />
                                      </div>
                                      <div>
                                        <div className="font-heading font-bold text-ilaw-navy">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-sm text-yellow-600 font-medium">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.email}</TableCell>
                                  <TableCell className="text-yellow-600 font-medium">{teacher.username}</TableCell>
                                  <TableCell>
                                    <span className="text-red-600 font-medium">
                                      {teacher.rejectionReason || "No reason provided"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                        onClick={() => handleApproveTeacher(teacher.id)}
                                        disabled={approveMutation.isPending}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        {approveMutation.isPending ? "Approving..." : "✅ Re-approve"}
                                      </Button>
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* == Reject Dialog == */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="border-2 border-brand-gold-200">
          <DialogHeader>
            <DialogTitle className="text-ilaw-navy font-heading font-bold">
              ❌ Reject Teacher Account
            </DialogTitle>
            <DialogDescription className="text-yellow-600">
              Please provide a reason for rejecting this teacher account. This will be visible to the teacher.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px] border-2 border-brand-gold-200 focus:border-ilaw-gold"
          />

          <DialogFooter>
            <motion.div whileHover={{ y: -1 }} whileTap={{ y: 0 }}>
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
                className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-bold"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                {rejectMutation.isPending ? "Rejecting..." : "❌ Reject Account"}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}