ALTER TABLE public.community_direct_messages
  ADD COLUMN IF NOT EXISTS is_intro_message boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS community_direct_messages_one_intro_per_pair
  ON public.community_direct_messages (sender_id, recipient_id)
  WHERE is_intro_message = true;

DROP POLICY IF EXISTS "Friends can send private messages when recipient allows"
  ON public.community_direct_messages;

CREATE POLICY "Friends or requesters can send one intro message"
  ON public.community_direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND COALESCE(
      (
        SELECT s.allow_direct_messages
        FROM public.community_privacy_settings s
        WHERE s.user_id = community_direct_messages.recipient_id
      ),
      true
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_friendships f
      WHERE (
        (
          f.status = 'accepted'
          AND (
            (f.requester_id = community_direct_messages.sender_id AND f.addressee_id = community_direct_messages.recipient_id)
            OR
            (f.requester_id = community_direct_messages.recipient_id AND f.addressee_id = community_direct_messages.sender_id)
          )
          AND community_direct_messages.is_intro_message = false
        )
        OR
        (
          f.status = 'pending'
          AND f.requester_id = community_direct_messages.sender_id
          AND f.addressee_id = community_direct_messages.recipient_id
          AND community_direct_messages.is_intro_message = true
        )
      )
    )
  );
