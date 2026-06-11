"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamSettingsWorkspace({ model }: { model: any }) {
  const { data: policies, isLoading, error } = useSchoolQuery<any[]>("/exams/grading-policies");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Configuration"
          title="Exam Settings"
          description="Configure global exam defaults, lock rules, and portal visibility."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults</Button>
          <Button><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grading Defaults</CardTitle>
            <CardDescription>Set the default passing marks for subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <div className="py-4 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading policies...</div>}
            {error && <div className="py-4 text-sm text-destructive">Failed to load policies.</div>}
            {!isLoading && !error && policies?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 border rounded-md">
                <span className="text-sm font-medium">{p.name} ({p.reporting_mode})</span>
                <span className="text-xs px-2 py-1 bg-muted rounded">{p.status}</span>
              </div>
            ))}
            {!isLoading && !error && (!policies || policies.length === 0) && (
              <div className="text-sm text-muted-foreground">No grading policies found.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marks Entry Lock Rules</CardTitle>
            <CardDescription>Automatically lock submissions to prevent tampering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lock After Deadline</Label>
                <div className="text-sm text-muted-foreground">Automatically lock marks entry when deadline passes.</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="grace-period">Grace Period (Hours)</Label>
              <Input id="grace-period" type="number" defaultValue="24" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Card Templates</CardTitle>
            <CardDescription>Configure the appearance of exported report cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include School Logo</Label>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Principal Signature</Label>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Official Stamp</Label>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal & Integrations</CardTitle>
            <CardDescription>Control what parents see and sync with other modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Block Results for Fee Balances</Label>
                <div className="text-sm text-muted-foreground">Requires Finance Module integration.</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="fee-threshold">Minimum Fee Balance Block Threshold (KES)</Label>
              <Input id="fee-threshold" type="number" defaultValue="1000" />
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <Label>Show Student Rank to Parents</Label>
                <div className="text-sm text-muted-foreground">Display class/stream rank on portal and report cards.</div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
