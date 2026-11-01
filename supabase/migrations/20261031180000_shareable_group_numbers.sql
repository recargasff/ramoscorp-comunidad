CREATE SEQUENCE IF NOT EXISTS public.community_groups_group_number_seq AS bigint START WITH 100000 INCREMENT BY 1 MINVALUE 100000 MAXVALUE 999999 NO CYCLE;
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS group_number bigint NOT NULL DEFAULT nextval('public.community_groups_group_number_seq');
ALTER SEQUENCE public.community_groups_group_number_seq OWNED BY public.community_groups.group_number;
CREATE UNIQUE INDEX IF NOT EXISTS community_groups_group_number_key ON public.community_groups(group_number);
