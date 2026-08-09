import { AuthenticatedUserDto } from './auth-response.dto';
import { DashboardRoleContextDto } from './dashboard-role.dto';

export class MeResponseDto {
  user!: AuthenticatedUserDto;
  role_context!: DashboardRoleContextDto;
}
