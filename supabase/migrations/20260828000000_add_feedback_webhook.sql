-- Webhook: on every feedback insert, enqueue an async HTTP call to the
-- notify-feedback edge function via pg_net. The queue is processed after
-- commit by a background worker, so email problems can never block or fail
-- the insert; the WHEN OTHERS guard covers even enqueue-time errors.
create or replace function public.notify_feedback_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://nrlqgxsusnxarajofasd.supabase.co/functions/v1/notify-feedback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybHFneHN1c254YXJham9mYXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgyMjUsImV4cCI6MjA5MTI1NDIyNX0.hybWhyJB5L2pxBK1xVTXXtrgYj4ShUduOrshVyenmrU'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'feedback',
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'notify_feedback_webhook failed: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_feedback_webhook() from public, anon, authenticated;

drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify
  after insert on public.feedback
  for each row execute function public.notify_feedback_webhook();
