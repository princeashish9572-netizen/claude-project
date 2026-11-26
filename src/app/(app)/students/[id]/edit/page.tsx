import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getCourses, getStudent } from "@/lib/data/students";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "@/components/student-form";
import { updateStudent } from "../../actions";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();
  const [student, courses] = await Promise.all([getStudent(supabase, id), getCourses(supabase)]);
  if (!student) notFound();

  // Default the "next due date" to the next upcoming unpaid due so a fee change
  // applies going forward rather than re-billing past periods.
  const nextDue = student.next_upcoming_date ?? student.schedule_start_date;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${student.name}`} />
      <StudentForm
        mode="edit"
        action={updateStudent.bind(null, student.id)}
        courses={courses}
        cancelHref={`/students/${student.id}`}
        defaults={{ ...student, schedule_start_date: nextDue }}
      />
    </div>
  );
}
