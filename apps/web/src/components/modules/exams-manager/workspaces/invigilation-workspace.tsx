"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Settings, Printer, Mail, UserCheck, UserX, AlertCircle, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function InvigilationWorkspace({ model }: { model: any }) {
  const { data: invigilatorsResponse, isLoading, error } = useSchoolQuery<any>("/exams/invigilators");
  const invigilators = invigilatorsResponse?.data || invigilatorsResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Invigilation"
          description="Assign teachers and staff to supervise exams and monitor attendance."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Auto-Assign</Button>
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print Roster</Button>
          <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Send Notices</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Assign Invigilators</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Invigilators", value: "45", icon: UserCheck, type: "default" },
          { label: "Unassigned Slots", value: "12", icon: AlertCircle, type: "warning" },
          { label: "Teacher Conflicts", value: "2", icon: UserX, type: "destructive" },
          { label: "Absent Invigilators", value: "1", icon: UserX, type: "destructive" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="eyebrow">{card.label}</p>
                <p className={`mt-3 metric-value text-${card.type === 'default' ? 'foreground' : card.type}`}>{card.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${card.type}/10 text-${card.type === 'default' ? 'primary' : card.type}`}>
                <Icon className="h-6 w-6" />
              </div>
            </Card>
          );
        })}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Class & Paper</TableHead>
                <TableHead>Main Invigilator</TableHead>
                <TableHead>Assistant</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading invigilators...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading invigilators: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!invigilators || !Array.isArray(invigilators) || invigilators.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No invigilators assigned yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(invigilators) && invigilators.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{row.timetable_slot_id || "Unassigned"}</TableCell>
                  <TableCell className="font-medium">Paper Allocation</TableCell>
                  <TableCell>{row.staff_user_id || "Unassigned"}</TableCell>
                  <TableCell className="text-muted-foreground italic">Unassigned</TableCell>
                  <TableCell>
                    <Badge variant="default">{row.role || "invigilator"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Mark Present</DropdownMenuItem>
                        <DropdownMenuItem>Mark Absent</DropdownMenuItem>
                        <DropdownMenuItem>Assign Replacement</DropdownMenuItem>
                        <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
