
revoke execute on function public.link_team_member_on_signup() from public, anon, authenticated;
revoke execute on function public.current_account_owner() from public, anon;
grant execute on function public.current_account_owner() to authenticated;
