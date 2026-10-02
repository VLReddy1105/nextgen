import {notFound,redirect} from 'next/navigation';
import {canManageCommunity,canManageProject} from '@/lib/auth/permissions';
export default async function ManageSpacePage({params}:{params:Promise<{kind:string;id:string}>}){const {kind,id}=await params;if(kind!=='communities'&&kind!=='projects')notFound();const allowed=kind==='communities'?await canManageCommunity(id):await canManageProject(id);if(!allowed)notFound();redirect(`/dashboard/${kind}/${id}?tab=team`);}
