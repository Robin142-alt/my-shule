"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Send, Clock, Eye, Copy, MessageSquare, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function CommunicationWorkspace({ model }: { model: any }) {
  const { data: seriesResponse, isLoading, error } = useSchoolQuery<any>("/exams/series");
  const series = seriesResponse?.data || seriesResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Communication"
          title="Exam Notices & Alerts"
          description="Send SMS and portal notifications to parents, students, and teachers."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Select Template</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Create Broadcast</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Exam Dates Alert", desc: "Notify parents of upcoming exams" },
          { label: "Marks Entry Reminder", desc: "Remind teachers to submit marks" },
          { label: "Results Published", desc: "Alert parents to view report cards" },
          { label: "Fee Balance Notice", desc: "Withheld results alert" },
        ].map((card, idx) => (
          <Card key={idx} className="p-5 flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition-colors h-[120px]">
            <div>
              <p className="font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> {card.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
            </div>
            <Button variant="ghost" size="sm" className="w-fit -ml-3 text-primary">Use Template</Button>
          </Card>
        ))}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold">Broadcast History</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Target Audience</TableHead>
                <TableHead>Message Snippet</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading active communications...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-destructive">
                    Error loading communications: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!series || !Array.isArray(series) || series.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No active communications.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(series) && series.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(row.starts_on).toLocaleDateString()}</TableCell>
                  <TableCell>All Parents</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">Notice for Exam: {row.name}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'published' ? 'success' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>System</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Full Message</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> Duplicate Broadcast</DropdownMenuItem>
                        {row.status === 'draft' && <DropdownMenuItem className="text-destructive"><Clock className="mr-2 h-4 w-4" /> Cancel Scheduled</DropdownMenuItem>}
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
