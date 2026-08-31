import { supabase } from '../supabase/client'

export type SupportRequestType='bug'|'product_feedback'|'data_question'|'account_help'|'pilot_feedback'|'pilot_incident'
export type SupportRequest={id:string;requestType:SupportRequestType;subject:string;status:'submitted'|'in_review'|'resolved'|'closed';supportReference:string;createdAt:string}
type Row={id:string;request_type:SupportRequestType;subject:string;status:SupportRequest['status'];support_reference:string;created_at:string}
const map=(row:Row):SupportRequest=>({id:row.id,requestType:row.request_type,subject:row.subject,status:row.status,supportReference:row.support_reference,createdAt:row.created_at})

export async function getSupportRequests(){
  const{data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error('Authentication required')
  const{data,error}=await supabase.from('customer_support_requests').select('id,request_type,subject,status,support_reference,created_at').order('created_at',{ascending:false}).limit(10)
  if(error)throw error;return(data as Row[]).map(map)
}
export async function submitSupportRequest(requestType:SupportRequestType,subject:string,message:string,rating:number|null){
  const{data,error}=await supabase.rpc('submit_customer_support_request',{p_request_type:requestType,p_subject:subject,p_message:message,p_customer_rating:rating})
  if(error)throw error;return map(data as Row)
}
