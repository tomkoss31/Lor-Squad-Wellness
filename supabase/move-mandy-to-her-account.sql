update public.clients
set
  distributor_id = 'f5285ea5-9521-4e0d-8e09-523e310c494f',
  distributor_name = 'Mandy Da Silva'
where first_name = 'Mandy'
  and last_name = 'Da Silva';

select
  first_name,
  last_name,
  distributor_id,
  distributor_name
from public.clients
where first_name = 'Mandy'
  and last_name = 'Da Silva';
