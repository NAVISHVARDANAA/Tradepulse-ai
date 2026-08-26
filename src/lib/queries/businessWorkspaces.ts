import { supabase } from '../supabase/client'

export type WorkspaceRole='owner'|'admin'|'analyst'|'viewer'
export type BusinessWorkspace={id:string;name:string;slug:string;status:'setup'|'active'|'suspended';seatLimit:number;role:WorkspaceRole}
export type WorkspaceInvitation={id:string;workspaceId:string;email:string;role:Exclude<WorkspaceRole,'owner'>;status:'pending'|'accepted'|'revoked'|'expired';expiresAt:string;workspace?:{name:string}|null}
export type WorkspaceMember={workspaceId:string;userId:string;role:WorkspaceRole;status:'active'|'suspended'}
type MembershipRow={workspace_id:string;user_id:string;role:WorkspaceRole;status:WorkspaceMember['status'];business_workspaces:{id:string;name:string;slug:string;status:BusinessWorkspace['status'];seat_limit:number}|null}
type InvitationRow={id:string;workspace_id:string;invited_email:string;role:WorkspaceInvitation['role'];status:WorkspaceInvitation['status'];expires_at:string;business_workspaces:{name:string}|null}

export async function getBusinessTeamAccess(){
  const{data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error('Authentication required')
  const[memberResult,inviteResult]=await Promise.all([
    supabase.from('business_workspace_memberships').select('workspace_id,user_id,role,status,business_workspaces(id,name,slug,status,seat_limit)'),
    supabase.from('business_workspace_invitations').select('id,workspace_id,invited_email,role,status,expires_at,business_workspaces(name)').order('created_at',{ascending:false}),
  ])
  if(memberResult.error)throw memberResult.error;if(inviteResult.error)throw inviteResult.error
  const rows=memberResult.data as unknown as MembershipRow[]
  return{workspaces:rows.filter(row=>row.user_id===auth.user.id&&row.status==='active'&&row.business_workspaces).map(row=>({...row.business_workspaces!,seatLimit:row.business_workspaces!.seat_limit,role:row.role})),members:rows.map(row=>({workspaceId:row.workspace_id,userId:row.user_id,role:row.role,status:row.status})),invitations:(inviteResult.data as unknown as InvitationRow[]).map(row=>({id:row.id,workspaceId:row.workspace_id,email:row.invited_email,role:row.role,status:row.status,expiresAt:row.expires_at,workspace:row.business_workspaces})),userId:auth.user.id,email:auth.user.email?.toLowerCase()??''}
}
export async function createBusinessWorkspace(name:string,slug:string){const{error}=await supabase.rpc('create_business_workspace',{p_name:name,p_slug:slug});if(error)throw error}
export async function inviteBusinessMember(workspaceId:string,email:string,role:WorkspaceInvitation['role']){const{error}=await supabase.rpc('invite_business_workspace_member',{p_workspace_id:workspaceId,p_email:email,p_role:role});if(error)throw error}
export async function acceptBusinessInvitation(invitationId:string){const{error}=await supabase.rpc('accept_business_workspace_invitation',{p_invitation_id:invitationId});if(error)throw error}
export async function removeBusinessMember(workspaceId:string,userId:string){const{error}=await supabase.rpc('remove_business_workspace_member',{p_workspace_id:workspaceId,p_user_id:userId});if(error)throw error}
