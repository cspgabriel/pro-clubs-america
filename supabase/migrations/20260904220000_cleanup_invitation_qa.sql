begin;

delete from public.email_events
where email in (
  'qa-onboarding-1788558429761@example.com',
  'qa-onboarding-1788558429762@example.com'
);

delete from public.profiles
where (id, email) in (
  ('ad0bca4d-eba2-475c-be5b-07eb2769a4a1'::uuid, 'qa-onboarding-1788558429761@example.com'),
  ('d1268030-a204-462a-9865-93662a61a739'::uuid, 'qa-onboarding-1788558429762@example.com')
);

commit;
