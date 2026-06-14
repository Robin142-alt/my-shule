// @ts-nocheck
"use client";

import { useState } from "react";
import { Check, Save, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export function MarksEntryWorkspace() {
  const [selectedExam, setSelectedExam] = useState("Mid-Term Math");
  const [selectedClass, setSelectedClass] = useState("Form 1 East");
  
  // Fetch real data from the exams module
  const { data: students, isLoading: studentsLoading } = useSchoolQuery('/api/students?class=' + encodeURIComponent(selectedClass));
  const { data: savedMarks, isLoading: marksLoading, refetch } = useSchoolQuery('/api/exams/marks?exam=' + encodeURIComponent(selectedExam));

  const [marks, setMarks] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const saveMarkMutation = useSchoolMutation({
    endpoint: '/api/exams/marks',
    method: 'POST',
    onSuccess: () => {
      refetch();
    }
  });

  const handleMarkChange = (studentId: string, val: string) => {
    // Basic validation for 0-100
    if (val === "" || (Number(val) >= 0 && Number(val) <= 100)) {
      setMarks(prev => ({ ...prev, [studentId]: val }));
    }
  };

  const getGrade = (scoreStr: string | undefined) => {
    if (!scoreStr) return "-";
    const score = Number(scoreStr);
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(marks).map(([studentId, score]) => 
        saveMarkMutation.mutateAsync({
          student_id: studentId,
          exam: selectedExam,
          score: Number(score)
        })
      );
      await Promise.all(promises);
      alert("All marks saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving some marks. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Mock list for now until students query finishes loading
  const displayStudents = students?.length > 0 ? students : [
    { id: "1", first_name: "Alice", last_name: "Kamau", admission_number: "ADM-001" },
    { id: "2", first_name: "Brian", last_name: "Ochieng", admission_number: "ADM-002" },
    { id: "3", first_name: "Cynthia", last_name: "Wanjiru", admission_number: "ADM-003" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Marks Entry</h2>
          <p className="text-sm text-slate-500 mt-1">Input scores for your assigned subjects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export Template
          </Button>
          <Button className="gap-2" onClick={handleSaveAll} disabled={isSaving}>
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Marks"}
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-slate-200 flex flex-col md:flex-row gap-4 bg-slate-50/50">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">Assessment</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option>Mid-Term Math</option>
            <option>End-of-Term Physics</option>
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">Class Section</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option>Form 1 East</option>
            <option>Form 2 West</option>
          </select>
        </div>
      </Card>

      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium w-16 text-center">#</th>
                <th className="px-4 py-3 font-medium w-32">Adm No</th>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium w-32 text-center">Score (100)</th>
                <th className="px-4 py-3 font-medium w-24 text-center">Grade</th>
                <th className="px-4 py-3 font-medium w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayStudents.map((student: any, idx: number) => {
                const currentVal = marks[student.id] !== undefined ? marks[student.id] : "";
                const isSaved = !!savedMarks?.find((m: any) => m.student_id === student.id);
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-2 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-500">{student.admission_number}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{student.first_name} {student.last_name}</td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        className="w-full text-center h-8 rounded border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
                        value={currentVal}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-slate-700">
                      {getGrade(currentVal)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isSaved ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-xs text-slate-400">Unsaved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

