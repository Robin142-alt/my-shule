import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverviewWorkspace } from '@/components/school/teacher-dashboard/overview-workspace';
import { fetchTeacherDashboardOverviewLive, fetchTimetableLive } from '@/lib/modules/teacher-live';

jest.mock('@/hooks/use-live-tenant-session', () => ({useLiveTenantSession: () => ({session:{tenantId:'qa-only',user:{user_id:'qa-teacher'}},isLoading:false,error:null})}));
jest.mock('@/lib/modules/teacher-live', () => ({fetchTeacherDashboardOverviewLive:jest.fn(),fetchTimetableLive:jest.fn()}));
const emptyMetric = {count:0,detail:'No outstanding work'};
const overview: Awaited<ReturnType<typeof fetchTeacherDashboardOverviewLive>> = {
 todaysLessons:emptyMetric, pendingAttendance:emptyMetric, pendingLessonLogs:emptyMetric,
 openMarkEntry:emptyMetric, assignmentsDue:emptyMetric, learnersNeedingAttention:emptyMetric,
 unreadMessages:emptyMetric, storeRequests:emptyMetric,
};
const fetchOverview = jest.mocked(fetchTeacherDashboardOverviewLive);
const fetchTimetable = jest.mocked(fetchTimetableLive);
function renderOverview(){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 return render(<QueryClientProvider client={client}><OverviewWorkspace onViewChange={jest.fn()} onStartAction={jest.fn()} /></QueryClientProvider>);
}
beforeEach(()=>{jest.clearAllMocks();fetchOverview.mockResolvedValue(overview);fetchTimetable.mockResolvedValue([]);});

it('renders a truthful summary without a hard-coded school term',async()=>{
 renderOverview();
 await screen.findAllByText('No outstanding work');
 expect(screen.queryByText(/Academic Year 2026/)).not.toBeInTheDocument();
 expect(screen.getByText('No lessons scheduled for today.')).toBeVisible();
 expect(screen.getByRole('button',{name:'View Weekly Timetable'})).toBeEnabled();
});

it('keeps failed teaching data visible and retryable without claiming an empty schedule',async()=>{
 fetchOverview.mockRejectedValueOnce(new Error('Teaching summary unavailable'));
 fetchTimetable.mockRejectedValueOnce(new Error('Timetable unavailable'));
 const user=userEvent.setup();renderOverview();
 expect(await screen.findByText('Teaching summary unavailable')).toBeVisible();
 expect(await screen.findByText('Your teaching plan is currently unavailable.')).toBeVisible();
 expect(screen.queryByText('No lessons scheduled for today.')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Retry teaching summary'}));
 await user.click(screen.getByRole('button',{name:'Retry teaching plan'}));
 await waitFor(()=>expect(screen.queryByText('Teaching summary unavailable')).not.toBeInTheDocument());
 expect(await screen.findByText('No lessons scheduled for today.')).toBeVisible();
 expect(fetchOverview).toHaveBeenCalledTimes(2);expect(fetchTimetable).toHaveBeenCalledTimes(2);
});
