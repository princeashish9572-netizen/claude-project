import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getCourses } from "@/lib/data/students";
import { todayIST } from "@/lib/date";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "@/components/student-form";
import { createStudent } from "../actions";

export const metadata: Metadata = { title: "Add student" };

export default async function NewStudentPage() {
  const { supabase } = await requireAdmin();
  const courses = await getCourses(supabase);
  const today = todayIST();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add student" description="Fee dues are created automatically from the schedule below." />
      <StudentForm
        mode="create"
        action={createStudent}
        courses={courses}
        cancelHref="/students"
        defaults={{ admission_date: today, schedule_start_date: today, billing_cycle: "monthly" }}
      />
    </div>
  );
}
