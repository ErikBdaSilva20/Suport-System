CREATE POLICY "Admins can delete tickets" ON public.tickets
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));